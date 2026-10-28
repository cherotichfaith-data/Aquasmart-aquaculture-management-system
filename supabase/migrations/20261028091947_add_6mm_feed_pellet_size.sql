-- Koudijs 6mm pellets are now in use on the farm; the pellet-size enum stopped at 5mm.
alter type public.feed_pellet_size add value if not exists '6mm';
