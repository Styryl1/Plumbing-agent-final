// Fails install if not on Node 22.x
const v = process.versions.node.split('.').map(Number);
if (v[0] !== 22) {
  console.error(`\n✖ Requires Node 22.x (found ${process.versions.node}).\n`);
  process.exit(1);
}