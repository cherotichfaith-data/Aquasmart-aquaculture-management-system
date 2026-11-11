const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const ts = require("typescript")
const React = require("react")
const { renderToStaticMarkup } = require("react-dom/server")
const source = fs.readFileSync("src/components/shared/copy-zoom.tsx", "utf8")
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
} }).outputText
const moduleCopy = { exports: {} }
new Function("require", "module", "exports", compiled)(id =>
  id === "@/components/app-ui/button" ? {
    Button: ({ variant, size, children, ...props }) => React.createElement("button", props, children),
  } : require(id), moduleCopy, moduleCopy.exports)
const { CopyZoom, CopyZoomChartTitle } = moduleCopy.exports

test("chart copy and zoom tools share the chart caption, with a separate export title", () => {
  const html = renderToStaticMarkup(React.createElement(CopyZoom, { type: "chart", name: "chart" },
    React.createElement("figure", null,
      React.createElement(CopyZoomChartTitle, null, "Measured growth"),
      React.createElement("svg", { className: "rpt-chart__svg" }))))
  const caption = html.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/)[1]
  assert.match(caption, /<span data-copy-title="">Measured growth/)
  assert.match(caption, /role="toolbar"/)
  assert.equal((html.match(/role="toolbar"/g) || []).length, 1)
  assert.match(html, /--copy-zoom:1/)
  assert.doesNotMatch(html, /style="zoom:/)
})

test("table without a section title has a title beside its toolbar", () => {
  const html = renderToStaticMarkup(React.createElement(CopyZoom, { type: "table", name: "Stock profile table" },
    React.createElement("table", null)))
  assert.match(html, /copy-zoom__heading.*<h3[^>]*>Stock profile table<\/h3>.*role="toolbar"/)
})

test("external section toolbar slots suppress a duplicate toolbar inside the content", () => {
  const html = renderToStaticMarkup(React.createElement(CopyZoom, { type: "chart", name: "chart", toolbarTarget: null },
    React.createElement("figure", null, React.createElement(CopyZoomChartTitle, null, "Measured growth"))))
  assert.doesNotMatch(html, /role="toolbar"/)
  assert.match(html, /Measured growth/)
})
