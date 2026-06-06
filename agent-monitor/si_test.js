const si = require('systeminformation');

async function test() {
  console.log("--- GRAPHICS ---");
  console.log(await si.graphics());

  console.log("\n--- USB ---");
  console.log(await si.usb());

  console.log("\n--- PRINTER ---");
  console.log(await si.printer());
}

test().catch(console.error);
