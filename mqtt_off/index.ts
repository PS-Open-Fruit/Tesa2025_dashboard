import mqtt, { MqttClient, type IClientOptions } from 'mqtt';

// ✅ Configuration from environment variables or defaults
const MQTT_BROKER = (process.env.MQTT_BROKER && process.env.MQTT_BROKER.trim() !== '') 
  ? process.env.MQTT_BROKER 
  : 'mqtt://localhost:1883';
const MQTT_USERNAME = process.env.MQTT_USERNAME || '';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || '';
const MQTT_CLIENT_ID = process.env.MQTT_CLIENT_ID || `mqtt_client_${Date.now()}`;

// ✅ Validate MQTT Broker URL
if (!MQTT_BROKER || (!MQTT_BROKER.startsWith('mqtt://') && !MQTT_BROKER.startsWith('mqtts://') && !MQTT_BROKER.startsWith('ws://') && !MQTT_BROKER.startsWith('wss://'))) {
  console.error('❌ Invalid MQTT broker URL. Must start with mqtt://, mqtts://, ws://, or wss://');
  console.error(`   Current value: ${MQTT_BROKER}`);
  console.error('   Please set MQTT_BROKER environment variable or use default: mqtt://localhost:1883');
  process.exit(1);
}

// ✅ MQTT Client Options
const options: IClientOptions = {
  clientId: MQTT_CLIENT_ID,
  username: MQTT_USERNAME || undefined,
  password: MQTT_PASSWORD || undefined,
  clean: true,
  reconnectPeriod: 5000, // Reconnect every 5 seconds
  connectTimeout: 30 * 1000, // 30 seconds
  keepalive: 60, // 60 seconds
};

// ✅ Create MQTT Client
let client: MqttClient | null = null;

// ✅ Topics to subscribe
const topics: string[] = ['OpenFruit/Offense/#'];

// ✅ Connect to MQTT Broker
console.log(`🔌 Connecting to MQTT broker: ${MQTT_BROKER}`);
client = mqtt.connect(MQTT_BROKER, options);

client.on("connect", () => {
    console.log('connect to MQTT Broker');
    if (client) {
        for (const topic of topics) {
            client.subscribe(topic, (error) => {
                if (!error) {
                    console.log(`Subcribe to topic ${topic}`);
                    client.publish('OpenFruit/Offense/1', 'Hello MQTT')
                } else {
                    console.log(`error subscribe ${topic} on : ${error}`);
                }
            });
        }
    }
});

client.on('error', (error: Error) => {
    console.error('❌ MQTT Connection error:', error);
});

client.on('close', () => {
    console.log('⚠️ MQTT Connection closed');
});


client.on('message', async (topic, message) => {
    // แสดงเฉพาะ message จาก topic OpenFruit/Offense/1 เท่านั้น
    if (topic === 'OpenFruit/Offense/1') {
        try {
            const messageStr = message.toString();
            
            // ตรวจสอบ message ว่าง
            if (!messageStr || messageStr.trim() === '') {
                console.log('⚠️ Message ว่าง ไม่ต้องทำอะไร');
                return;
            }
            
            // Parse JSON
            let jsonData: any;
            try {
                jsonData = JSON.parse(messageStr);
            } catch (parseError) {
                return;
            }
            
            // API Configuration
            const api = `https://tesa-api.crma.dev/api/object-detection/d9ff54d9-77fc-4336-87fd-aed8b23a7931`;
            const header = { "x-camera-token": "44e1410c-31ad-4b7e-8385-19e853763864" };
            
            // Objects data from JSON message
            const objects = Array.isArray(jsonData) ? jsonData : [jsonData];
            
            // Read image file
            const imagePath = './download.jpg';
            const imageFile = Bun.file(imagePath);
            
            if (!await imageFile.exists()) {
                return;
            }
            
            // Create FormData
            const formData = new FormData();
            formData.append('image', imageFile);
            formData.append('timestamp', new Date().toISOString());
            formData.append('objects', JSON.stringify(objects));
            
            // Send HTTP POST request
            const response = await fetch(api, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'x-camera-token': header['x-camera-token'],
                },
                body: formData,
            });
            
            if (response.ok) {
                console.log('✅ ส่งสำเร็จ');
            }
            
        } catch (error) {
            // Silent error handling
        }
    }
});