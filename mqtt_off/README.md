# MQTT Client

โปรแกรมเชื่อมต่อ MQTT Broker สำหรับรับ-ส่งข้อมูลแบบ real-time

## การติดตั้ง

```bash
bun install
```

## การตั้งค่า

สร้างไฟล์ `.env` ในโฟลเดอร์ `mqtt_off`:

```env
MQTT_BROKER=mqtt://localhost:1883
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password
MQTT_CLIENT_ID=mqtt_client_001
```

## การใช้งาน

### รันโปรแกรม

```bash
bun run start
# หรือ
bun run dev  # รันแบบ watch mode
```

### ใช้งานเป็น Module

```typescript
import { 
  connectMQTT, 
  subscribe, 
  publish, 
  onMessage, 
  disconnect,
  isConnected 
} from './mqtt_off/index';

// เชื่อมต่อ MQTT
const client = connectMQTT();

// Subscribe topic
subscribe('sensor/data', 1);

// รับข้อความ
onMessage((topic, message) => {
  console.log(`Topic: ${topic}, Message: ${message.toString()}`);
});

// Publish ข้อความ
publish('test/topic', { 
  message: 'Hello MQTT',
  timestamp: new Date().toISOString()
}, { qos: 1 });

// ตรวจสอบสถานะการเชื่อมต่อ
if (isConnected()) {
  console.log('Connected!');
}

// Disconnect
disconnect();
```

## API Functions

### `connectMQTT(): MqttClient`
เชื่อมต่อกับ MQTT Broker

### `subscribe(topic: string | string[], qos?: 0 | 1 | 2): void`
Subscribe ไปยัง topic ที่กำหนด

### `unsubscribe(topic: string | string[]): void`
Unsubscribe จาก topic

### `publish(topic: string, message: string | object, options?: { qos?: 0 | 1 | 2, retain?: boolean }): void`
Publish ข้อความไปยัง topic

### `onMessage(callback: (topic: string, message: Buffer) => void): void`
ตั้งค่า callback สำหรับรับข้อความ

### `disconnect(): void`
ตัดการเชื่อมต่อ

### `isConnected(): boolean`
ตรวจสอบสถานะการเชื่อมต่อ

### `getClient(): MqttClient | null`
ดึง MQTT client instance

## Features

- ✅ Auto-reconnect
- ✅ Support QoS 0, 1, 2
- ✅ Support multiple topics subscription
- ✅ JSON message support
- ✅ Error handling
- ✅ Connection status monitoring
- ✅ Environment variable configuration
