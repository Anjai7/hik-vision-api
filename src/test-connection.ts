import { config } from './config';
import { HikvisionClient, HikvisionDevice, HikvisionUsers, HikvisionEvents } from './hikvision';

async function main() {
  console.log('\n======================================================');
  console.log('   🔍 TESTING HIKVISION TERMINAL CONNECTIVITY');
  console.log('======================================================');
  console.log(`Target Host    : ${config.HIKVISION_HOST}`);
  console.log(`Username       : ${config.HIKVISION_USERNAME}`);
  console.log(`Verify TLS     : ${config.HIKVISION_VERIFY_TLS}`);
  console.log(`Timeout        : ${config.HIKVISION_TIMEOUT}ms\n`);

  console.log('Connecting to Hikvision terminal via ISAPI over HTTPS...');

  const client = new HikvisionClient({
    host: config.HIKVISION_HOST,
    username: config.HIKVISION_USERNAME,
    password: config.HIKVISION_PASSWORD,
    verifyTls: config.HIKVISION_VERIFY_TLS,
    timeoutMs: config.HIKVISION_TIMEOUT,
  });

  const device = new HikvisionDevice(client);
  const users = new HikvisionUsers(client);
  const events = new HikvisionEvents(client);

  try {
    const status = await device.testConnection();

    if (status.online) {
      console.log('✅ Status         : ONLINE');
      console.log(`⚡ Latency        : ${status.latencyMs}ms`);
      console.log(`📦 Model          : ${status.deviceInfo?.model || 'Unknown'}`);
      console.log(`🔢 Firmware       : ${status.deviceInfo?.firmwareVersion || 'Unknown'}`);
      console.log(`🏷️  Serial Number  : ${status.deviceInfo?.serialNumber || 'Unknown'}`);

      // Query registered users count
      try {
        const userStats = await users.getUserCount();
        console.log(`👥 Registered Users: ${userStats.userNumber}`);
        console.log(`   - Fingerprint Users: ${userStats.bindFingerprintUserNumber}`);
        console.log(`   - Face Users       : ${userStats.bindFaceUserNumber}`);
        console.log(`   - Card Users       : ${userStats.bindCardUserNumber}`);
      } catch (err: any) {
        console.log(`👥 Users count query failed: ${err.message}`);
      }

      // Query recent events
      try {
        const eventsRes = await events.searchEvents({ position: 0, maxResults: 3 });
        console.log(`📋 Total Events on Device: ${eventsRes.totalMatches}`);
        if (eventsRes.events.length > 0) {
          console.log('\nLatest Event:');
          console.log(`   - Time        : ${eventsRes.events[0].deviceDate} ${eventsRes.events[0].deviceTime}`);
          console.log(`   - Employee    : ${eventsRes.events[0].employeeName || eventsRes.events[0].employeeNo || 'N/A'}`);
          console.log(`   - Description : ${eventsRes.events[0].description}`);
          console.log(`   - Mode        : ${eventsRes.events[0].verifyModeLabel}`);
        }
      } catch (err: any) {
        console.log(`📋 Events query failed: ${err.message}`);
      }

      console.log('\n🎉 SUCCESS! Your Public IP & Port Forwarding connection works perfectly!\n');
    } else {
      console.log('❌ Status         : OFFLINE');
      console.log(`⚠️  Reason         : ${status.error || 'Connection failed'}`);
      console.log('\nTroubleshooting tips:');
      console.log('1. Verify your router port forwarding rule (WAN port -> LAN IP:443 TCP)');
      console.log('2. Check if your Public IP has changed (or verify your DDNS hostname)');
      console.log('3. Ensure your Hikvision terminal is turned on and connected to the local network');
      console.log('4. Verify HIKVISION_USERNAME and HIKVISION_PASSWORD in .env\n');
    }
  } catch (error: any) {
    console.error('❌ Connection error:', error.message || error);
  }
}

main();
