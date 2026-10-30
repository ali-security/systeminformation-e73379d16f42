const fs = require('fs');
const os = require('os');
const path = require('path');
const si = require('../lib/index');
const util = require('../lib/util');

let testsPassed = 0;

const testWithTimeout = async (fn) => {
  return new Promise((resolve, reject) => {
    (async () => {
      const timeout = setTimeout(() => {
        reject('Test Timeout');
      }, 240000);
      const result = await fn();
      clearTimeout(timeout);
      testsPassed++;
      console.log(`ok ${testsPassed} - ${fn.name}`);
      return resolve(result);
    })();
  });
};

(async () => {
  try {
    const startTotalTime = Date.now();
    let startTime = startTotalTime;
    console.log('Testing system:');
    console.log(await testWithTimeout(si.system));
    console.log('----------------------------------------');
    console.log(`Time to complete: ${(Date.now() - startTime) * 0.001} s`); startTime = Date.now();
    console.log('----------------------------------------\n');

    console.log('Testing cpu:');
    console.log(await testWithTimeout(si.cpu));
    console.log('----------------------------------------');
    console.log(`Time to complete: ${(Date.now() - startTime) * 0.001} s`); startTime = Date.now();
    console.log('----------------------------------------\n');

    console.log('Testing mem:');
    console.log(await testWithTimeout(si.mem));
    console.log('----------------------------------------');
    console.log(`Time to complete: ${(Date.now() - startTime) * 0.001} s`); startTime = Date.now();
    console.log('----------------------------------------\n');

    console.log('Testing memLayout:');
    console.log(await testWithTimeout(si.memLayout));
    console.log('----------------------------------------');
    console.log(`Time to complete: ${(Date.now() - startTime) * 0.001} s`); startTime = Date.now();
    console.log('----------------------------------------\n');

    console.log('Testing graphics:');
    console.log(await testWithTimeout(si.graphics));
    console.log('----------------------------------------');
    console.log(`Time to complete: ${(Date.now() - startTime) * 0.001} s`); startTime = Date.now();
    console.log('----------------------------------------\n');

    console.log('Testing diskLayout:');
    console.log(await testWithTimeout(si.diskLayout));
    console.log('----------------------------------------');
    console.log(`Time to complete: ${(Date.now() - startTime) * 0.001} s`); startTime = Date.now();
    console.log('----------------------------------------\n');

    console.log('Testing fsSize:');
    console.log(await testWithTimeout(si.fsSize));
    console.log('----------------------------------------');
    console.log(`Time to complete: ${(Date.now() - startTime) * 0.001} s`); startTime = Date.now();
    console.log('----------------------------------------\n');

    console.log('Testing blockDevices:');
    console.log(await testWithTimeout(si.blockDevices));
    console.log('----------------------------------------');
    console.log(`Time to complete: ${(Date.now() - startTime) * 0.001} s`); startTime = Date.now();
    console.log('----------------------------------------\n');

    console.log('Testing osInfo:');
    console.log(await testWithTimeout(si.osInfo));
    console.log('----------------------------------------');
    console.log(`Time to complete: ${(Date.now() - startTime) * 0.001} s`); startTime = Date.now();
    console.log('----------------------------------------\n');

    console.log('Testing networkInterfaces:');
    console.log(await testWithTimeout(si.networkInterfaces));
    console.log('----------------------------------------');
    console.log(`Time to complete: ${(Date.now() - startTime) * 0.001} s`); startTime = Date.now();
    console.log('----------------------------------------\n');

    console.log('Testing networkInterfaceDefault:');
    console.log(await testWithTimeout(si.networkInterfaceDefault));
    console.log('----------------------------------------');
    console.log(`Time to complete: ${(Date.now() - startTime) * 0.001} s`); startTime = Date.now();
    console.log('----------------------------------------\n');

    if (process.platform === 'linux') {
      // interface name must not escape /sys/class/net (../ + symlinks -> file disclosure)
      console.log('Testing networkStats path traversal:');
      const traversalSecret = 'si-path-traversal-secret';
      const traversalDir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'si-'));
      const traversalStatNames = ['rx_bytes', 'tx_bytes', 'rx_dropped', 'rx_errors', 'tx_dropped', 'tx_errors'];
      fs.writeFileSync(path.join(traversalDir, 'secret'), traversalSecret + '\n');
      fs.symlinkSync(path.join(traversalDir, 'secret'), path.join(traversalDir, 'operstate'));
      fs.mkdirSync(path.join(traversalDir, 'statistics'));
      traversalStatNames.forEach((name) => {
        fs.writeFileSync(path.join(traversalDir, 'statistics', name), '0\n');
      });
      const networkStatsPathTraversal = async () => {
        const traversalStats = [];
        for (const iface of ['../../..' + traversalDir, '..', '.']) {
          traversalStats.push((await si.networkStats(iface))[0]);
        }
        return traversalStats;
      };
      let traversalStats;
      try {
        traversalStats = await testWithTimeout(networkStatsPathTraversal);
      } finally {
        traversalStatNames.forEach((name) => {
          fs.unlinkSync(path.join(traversalDir, 'statistics', name));
        });
        fs.rmdirSync(path.join(traversalDir, 'statistics'));
        fs.unlinkSync(path.join(traversalDir, 'operstate'));
        fs.unlinkSync(path.join(traversalDir, 'secret'));
        fs.rmdirSync(traversalDir);
      }
      console.log(traversalStats);
      traversalStats.forEach((stats) => {
        if (!stats || stats.operstate !== 'unknown' || stats.rx_bytes !== 0 || stats.tx_bytes !== 0) {
          throw new Error('networkStats() read outside /sys/class/net for iface: ' + (stats && stats.iface));
        }
      });
      console.log('----------------------------------------');
      console.log(`Time to complete: ${(Date.now() - startTime) * 0.001} s`); startTime = Date.now();
      console.log('----------------------------------------\n');
    }

    // unicode quotes (U+2018-U+201E) and dashes (U+2013-U+2015) are treated as ' " - by PowerShell
    console.log('Testing sanitizeShellString unicode quotes and dashes:');
    const sanitizeUnicodeQuotes = async () => {
      return util.sanitizeShellString('a-b‘c’d‚e‛f“g”h„i–j—k―l');
    };
    const unicodeSanitized = await testWithTimeout(sanitizeUnicodeQuotes);
    console.log(unicodeSanitized);
    if (unicodeSanitized !== 'a-bcdefghijkl') {
      throw new Error('sanitizeShellString() kept unicode quotes or dashes: ' + unicodeSanitized);
    }
    console.log('----------------------------------------');
    console.log(`Time to complete: ${(Date.now() - startTime) * 0.001} s`); startTime = Date.now();
    console.log('----------------------------------------\n');

    if (process.platform === 'win32') {
      // service name must not break out of the PowerShell -Filter string (unicode quote + subexpression)
      console.log('Testing services PowerShell injection:');
      const injectionMarkerName = 'si-services-injection-marker';
      const injectionMarker = path.join(process.cwd(), injectionMarkerName);
      if (fs.existsSync(injectionMarker)) {
        fs.unlinkSync(injectionMarker);
      }
      const servicesPowerShellInjection = async () => {
        return si.services('si-test” (new-item -itemtype file -path ' + injectionMarkerName + ' -force) ”');
      };
      let injectionServices;
      let injected = false;
      try {
        injectionServices = await testWithTimeout(servicesPowerShellInjection);
      } finally {
        injected = fs.existsSync(injectionMarker);
        if (injected) {
          fs.unlinkSync(injectionMarker);
        }
      }
      console.log(injectionServices);
      if (injected) {
        throw new Error('services() executed injected PowerShell command');
      }
      console.log('----------------------------------------');
      console.log(`Time to complete: ${(Date.now() - startTime) * 0.001} s`); startTime = Date.now();
      console.log('----------------------------------------\n');
    }

    console.log('Testing time:');
    console.log(await testWithTimeout(si.time));
    console.log('----------------------------------------');
    console.log(`Time to complete: ${(Date.now() - startTime) * 0.001} s`); startTime = Date.now();
    console.log('----------------------------------------\n');

    console.log('Testing currentLoad:');
    console.log(await testWithTimeout(si.currentLoad));
    console.log('----------------------------------------');
    console.log(`Time to complete: ${(Date.now() - startTime) * 0.001} s`); startTime = Date.now();
    console.log('----------------------------------------\n');

    console.log('Testing cpuTemperature:');
    console.log(await testWithTimeout(si.cpuTemperature));
    console.log('----------------------------------------');
    console.log(`Time to complete: ${(Date.now() - startTime) * 0.001} s`); startTime = Date.now();
    console.log('----------------------------------------\n');

    console.log('Testing UUID:');
    console.log(await testWithTimeout(si.uuid));
    console.log('----------------------------------------');
    console.log(`Time to complete: ${(Date.now() - startTime) * 0.001} s`); startTime = Date.now();
    console.log('----------------------------------------\n');

    console.log('Testing Versions:');
    console.log(await testWithTimeout(si.versions));
    console.log('----------------------------------------');
    console.log(`Time to complete: ${(Date.now() - startTime) * 0.001} s`);
    console.log('----------------------------------------\n');

    console.log('All tests complete.');
    console.log(`Tests passed: ${testsPassed}, failed: 0`);
    console.log('----------------------------------------');
    console.log(`Time to complete: ${(Date.now() - startTotalTime) * 0.001} s`);
    console.log('----------------------------------------\n');
    process.exit(0);
  } catch (e) {
    console.log(e);
    console.log('One or more tests failed.');
    console.log(`Tests passed: ${testsPassed}, failed: 1`);
    process.exit(1);
  }
})();
