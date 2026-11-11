const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const ts = require("typescript")
const compiled = ts.transpileModule(fs.readFileSync("src/components/shared/clipboard.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const loaded = { exports: {} }
new Function("module", "exports", compiled)(loaded, loaded.exports)
const { copyImage, copyEditableTable } = loaded.exports
async function withClipboard(clipboard, action, supportsItem = true) {
  const navigatorBefore = Object.getOwnPropertyDescriptor(globalThis, "navigator")
  const itemBefore = Object.getOwnPropertyDescriptor(globalThis, "ClipboardItem")
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { clipboard } })
  Object.defineProperty(globalThis, "ClipboardItem", { configurable: true, value: supportsItem ? class {
    constructor(data) { this.data = data }
  } : undefined })
  try { return await action() } finally {
    if (navigatorBefore) Object.defineProperty(globalThis, "navigator", navigatorBefore)
    else delete globalThis.navigator
    if (itemBefore) Object.defineProperty(globalThis, "ClipboardItem", itemBefore)
    else delete globalThis.ClipboardItem
  }
}
test("image copy writes PNG only and starts the write before rendering resolves", async () => {
  let render
  const png = new Promise(resolve => { render = resolve })
  const writes = []
  await withClipboard({
    write: async items => { writes.push(items); await items[0].data["image/png"] },
    writeText: () => assert.fail("Image copy must not write text"),
  }, async () => {
    const pending = copyImage(png)
    assert.equal(writes.length, 1)
    assert.deepEqual(Object.keys(writes[0][0].data), ["image/png"])
    render(new Blob(["png"], { type: "image/png" }))
    assert.deepEqual(await pending, { copied: true })
  })
})
test("blocked image writes offer the PNG instead of silently falling back to text", async () => {
  const blob = new Blob(["png"], { type: "image/png" })
  await withClipboard({
    write: async () => { throw new Error("NotAllowedError") },
    writeText: () => assert.fail("No text fallback for images"),
  }, async () => assert.deepEqual(await copyImage(Promise.resolve(blob)), { copied: false, blob }))
  await withClipboard({ writeText: () => assert.fail("No text fallback for unsupported image copying") },
    async () => assert.deepEqual(await copyImage(Promise.resolve(blob)), { copied: false, blob }), false)
})
test("editable table is an explicit HTML/text format without an image representation", async () => {
  const writes = []
  await withClipboard({ write: async items => { writes.push(items) } }, async () => {
    await copyEditableTable("<table><td>05.26mixi</td></table>", "05.26mixi")
    assert.deepEqual(Object.keys(writes[0][0].data), ["text/html", "text/plain"])
    assert.match(await writes[0][0].data["text/html"].text(), /05.26mixi/)
  })
})
test("only the editable-table choice permits a plain-text compatibility fallback", async () => {
  const texts = []
  await withClipboard({
    write: async () => { throw new Error("Unsupported format") },
    writeText: async text => texts.push(text),
  }, async () => {
    await copyEditableTable("<table></table>", "Batch\tGrowth\n03.25\t148.6")
    assert.deepEqual(texts, ["Batch\tGrowth\n03.25\t148.6"])
  })
})
