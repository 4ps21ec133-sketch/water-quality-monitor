
"use strict";

// =====================================================
// ESP32 WATER QUALITY MONITOR
// ESP32 -> BLE -> WEBSITE
// =====================================================

// IMPORTANT: Keep all UUIDs lowercase.
const DEVICE_NAME = "Water Quality Monitor";

const SERVICE_UUID =
    "6e400001-b5a3-f393-e0a9-e50e24dcca9e";

const TX_UUID =
    "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

// =====================================================
// HTML ELEMENTS
// =====================================================

const connectButton = document.getElementById("connectButton");
const statusElement = document.getElementById("status");
const rawDataElement = document.getElementById("rawData");

const tdsElement = document.getElementById("tds");
const turbidityElement = document.getElementById("turbidity");
const temperatureElement = document.getElementById("temperature");
const qualityElement = document.getElementById("quality");

// =====================================================
// BLE VARIABLES
// =====================================================

let bleDevice = null;
let txCharacteristic = null;
let keepConnection = false;

// =====================================================
// STATUS DISPLAY
// =====================================================

function setStatus(message) {
    if (statusElement) {
        statusElement.textContent = message;
    }
    console.log(message);
}

// =====================================================
// CONNECT BUTTON
// =====================================================

if (connectButton) {
    connectButton.addEventListener("click", connectBLE);
} else {
    console.error("HTML element connectButton was not found.");
}

// =====================================================
// CONNECT TO ESP32
// =====================================================

async function connectBLE() {
    if (!navigator.bluetooth) {
        setStatus(
            "Web Bluetooth is unavailable. Open this website in supported Chrome over HTTPS."
        );
        return;
    }

    try {
        keepConnection = true;
        setStatus("Select Water Quality Monitor...");

        console.log("Service UUID:", SERVICE_UUID);
        console.log("TX UUID:", TX_UUID);

        // Request the ESP32.
        bleDevice = await navigator.bluetooth.requestDevice({
            filters: [
                { name: DEVICE_NAME }
            ],
            optionalServices: [
                SERVICE_UUID
            ]
        });

        bleDevice.addEventListener(
            "gattserverdisconnected",
            handleDisconnect
        );

        setStatus("Connecting to " + bleDevice.name + "...");

        // Connect to the GATT server.
        const server = await bleDevice.gatt.connect();

        // Get the custom BLE service.
        const service = await server.getPrimaryService(
            SERVICE_UUID
        );

        // Get the ESP32 TX notification characteristic.
        txCharacteristic = await service.getCharacteristic(
            TX_UUID
        );

        // Listen for incoming notifications.
        txCharacteristic.addEventListener(
            "characteristicvaluechanged",
            handleBLEData
        );

        await txCharacteristic.startNotifications();

        setStatus("Connected to " + bleDevice.name);
        console.log("BLE notifications started.");

    } catch (error) {
        console.error("BLE connection error:", error);
        setStatus("Connection failed: " + error.message);
    }
}

// =====================================================
// RECEIVE BLE DATA
// =====================================================

function handleBLEData(event) {
    const value = event.target.value;

    const decoder = new TextDecoder("utf-8");

    const receivedText = decoder.decode(value).trim();

    if (!receivedText) {
        return;
    }

    console.log("BLE received:", receivedText);

    if (rawDataElement) {
        rawDataElement.textContent = receivedText;
    }

    parseWaterData(receivedText);
}

// =====================================================
// PARSE ESP32 DATA
//
// Expected example:
// TDS:120,TURB:250,TEMP:28.5,Q:GOOD
// =====================================================

function parseWaterData(data) {
    const tdsMatch = data.match(/(?:^|,)TDS:\s*(-?\d+(?:\.\d+)?)/i);
    const turbidityMatch = data.match(/(?:^|,)TURB:\s*(-?\d+(?:\.\d+)?)/i);
    const temperatureMatch = data.match(/(?:^|,)TEMP:\s*(-?\d+(?:\.\d+)?)/i);
    const qualityMatch = data.match(/(?:^|,)Q:\s*([A-Za-z]+)/i);

    if (tdsMatch && tdsElement) {
        tdsElement.textContent = tdsMatch[1];
    }

    if (turbidityMatch && turbidityElement) {
        turbidityElement.textContent = turbidityMatch[1];
    }

    if (temperatureMatch && temperatureElement) {
        temperatureElement.textContent =
            Number(temperatureMatch[1]).toFixed(1);
    }

    if (qualityMatch && qualityElement) {
        const quality = qualityMatch[1].toUpperCase();
        qualityElement.textContent = quality;
        qualityElement.className = "quality " + quality.toLowerCase();
    }
}

// =====================================================
// HANDLE DISCONNECTION
// =====================================================

function handleDisconnect() {
    txCharacteristic = null;

    if (keepConnection) {
        setStatus("ESP32 disconnected. Click Connect to reconnect.");
    } else {
        setStatus("Disconnected.");
    }
}

// =====================================================
// DISCONNECT WHEN NEEDED
// =====================================================

async function disconnectBLE() {
    keepConnection = false;

    if (txCharacteristic) {
        txCharacteristic.removeEventListener(
            "characteristicvaluechanged",
            handleBLEData
        );
    }

    if (bleDevice && bleDevice.gatt && bleDevice.gatt.connected) {
        bleDevice.gatt.disconnect();
    }

    txCharacteristic = null;
    setStatus("Disconnected.");
}
