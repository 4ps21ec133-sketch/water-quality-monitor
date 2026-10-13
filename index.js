
"use strict";

// =====================================================
// ESP32 WATER QUALITY MONITOR
// ESP32 -> BLE -> WEBSITE
// =====================================================

// All UUIDs are lowercase to avoid the previous
// Invalid Service name error.

const DEVICE_NAME = "Water Quality Monitor";

const SERVICE_UUID =
    "6e400001-b5a3-f393-e0a9-e50e24dcca9e";

const TX_UUID =
    "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

// =====================================================
// HTML ELEMENTS — IDs MUST MATCH index.html
// =====================================================

const connectButton = document.getElementById("connectButton");
const buttonText = document.getElementById("buttonText");
const buttonIcon = document.getElementById("buttonIcon");
const statusElement = document.getElementById("status");
const bluetoothIcon = document.getElementById("bluetoothIcon");

const tdsElement = document.getElementById("tds");
const turbidityElement = document.getElementById("turbidity");
const temperatureElement = document.getElementById("temperature");

const qualityElement = document.getElementById("quality");
const qualityCard = document.getElementById("qualityCard");
const qualityIcon = document.getElementById("qualityIcon");
const rawDataElement = document.getElementById("rawData");

// =====================================================
// BLE VARIABLES
// =====================================================

let bleDevice = null;
let txCharacteristic = null;
let isConnecting = false;

// =====================================================
// STATUS DISPLAY
// =====================================================

function setStatus(message, connected = false) {
    if (statusElement) {
        statusElement.textContent = message;
    }

    if (bluetoothIcon) {
        bluetoothIcon.classList.toggle("connected", connected);
        bluetoothIcon.classList.toggle("disconnected", !connected);
    }

    if (connectButton) {
        connectButton.disabled = isConnecting;
    }

    if (buttonText) {
        buttonText.textContent = connected
            ? "DISCONNECT BLUETOOTH"
            : "CONNECT BLUETOOTH";
    }

    if (buttonIcon) {
        buttonIcon.textContent = connected ? "🟢" : "🔵";
    }
}

// =====================================================
// CONNECT / DISCONNECT BUTTON
// =====================================================

connectButton.addEventListener("click", async () => {
    if (bleDevice && bleDevice.gatt && bleDevice.gatt.connected) {
        disconnectBLE();
    } else {
        await connectBLE();
    }
});

// =====================================================
// CONNECT TO ESP32
// =====================================================

async function connectBLE() {
    if (isConnecting) return;

    if (!navigator.bluetooth) {
        setStatus("Web Bluetooth is unavailable. Use supported Chrome over HTTPS.");
        return;
    }

    isConnecting = true;
    connectButton.disabled = true;

    try {
        setStatus("Select Water Quality Monitor...");

        console.log("Service UUID:", SERVICE_UUID);
        console.log("TX UUID:", TX_UUID);

        bleDevice = await navigator.bluetooth.requestDevice({
            filters: [
                { name: DEVICE_NAME }
            ],
            optionalServices: [
                SERVICE_UUID
            ]
        });

        bleDevice.removeEventListener(
            "gattserverdisconnected",
            onDisconnected
        );

        bleDevice.addEventListener(
            "gattserverdisconnected",
            onDisconnected
        );

        setStatus("Connecting to ESP32...");

        const server = await bleDevice.gatt.connect();

        const service = await server.getPrimaryService(
            SERVICE_UUID
        );

        txCharacteristic = await service.getCharacteristic(
            TX_UUID
        );

        txCharacteristic.addEventListener(
            "characteristicvaluechanged",
            onBLEDataReceived
        );

        await txCharacteristic.startNotifications();

        console.log("BLE connected; notifications enabled.");

        setStatus("Connected to " + (bleDevice.name || DEVICE_NAME), true);

    } catch (error) {
        console.error("BLE connection error:", error);

        setStatus("Connection failed: " + error.message);

        if (bleDevice && bleDevice.gatt && bleDevice.gatt.connected) {
            bleDevice.gatt.disconnect();
        }
    } finally {
        isConnecting = false;
        connectButton.disabled = false;
    }
}

// =====================================================
// RECEIVE DATA FROM ESP32
// ESP32 sends one complete string every 2 seconds.
// No # terminator is required.
// =====================================================

function onBLEDataReceived(event) {
    const dataView = event.target.value;
    const receivedData = new TextDecoder("utf-8")
        .decode(dataView)
        .trim();

    if (!receivedData) return;

    console.log("Received from ESP32:", receivedData);

    if (rawDataElement) {
        rawDataElement.textContent = receivedData;
    }

    parseSensorData(receivedData);
}

// =====================================================
// PARSE SENSOR DATA
//
// Expected:
// TDS:378,TURB:1250,TEMP:27.50,Q:GOOD
// =====================================================

function parseSensorData(data) {
    const values = {};

    data.split(",").forEach((part) => {
        const separator = part.indexOf(":");

        if (separator === -1) return;

        const key = part.slice(0, separator).trim().toUpperCase();
        const value = part.slice(separator + 1).trim();

        values[key] = value;
    });

    if (values.TDS !== undefined && tdsElement) {
        const number = Number(values.TDS);

        if (Number.isFinite(number)) {
            tdsElement.textContent = number;
        }
    }

    if (values.TURB !== undefined && turbidityElement) {
        const number = Number(values.TURB);

        if (Number.isFinite(number)) {
            turbidityElement.textContent = number;
        }
    }

    if (values.TEMP !== undefined && temperatureElement) {
        const number = Number(values.TEMP);

        if (Number.isFinite(number) && number !== -127) {
            temperatureElement.textContent = number.toFixed(2);
        } else if (number === -127) {
            temperatureElement.textContent = "Sensor error";
        }
    }

    if (values.Q !== undefined) {
        updateQuality(values.Q);
    }
}

// =====================================================
// UPDATE WATER QUALITY DISPLAY
// =====================================================

function updateQuality(value) {
    const quality = value.trim().toUpperCase();

    if (qualityElement) {
        qualityElement.textContent = quality;
    }

    if (qualityCard) {
        qualityCard.classList.remove(
            "quality-pure",
            "quality-excellent",
            "quality-good",
            "quality-fair",
            "quality-high"
        );

        const validQualities = [
            "PURE",
            "EXCELLENT",
            "GOOD",
            "FAIR",
            "HIGH"
        ];

        if (validQualities.includes(quality)) {
            qualityCard.classList.add(
                "quality-" + quality.toLowerCase()
            );
        }
    }

    if (qualityIcon) {
        switch (quality) {
            case "PURE":
                qualityIcon.textContent = "💧";
                break;

            case "EXCELLENT":
                qualityIcon.textContent = "✓";
                break;

            case "GOOD":
                qualityIcon.textContent = "✓";
                break;

            case "FAIR":
                qualityIcon.textContent = "!";
                break;

            case "HIGH":
                qualityIcon.textContent = "⚠";
                break;

            default:
                qualityIcon.textContent = "?";
        }
    }
}

// =====================================================
// HANDLE DISCONNECTION
// =====================================================

function onDisconnected() {
    txCharacteristic = null;

    setStatus("Disconnected. Click to reconnect.");

    console.log("ESP32 BLE disconnected.");
}

// =====================================================
// DISCONNECT
// =====================================================

function disconnectBLE() {
    if (txCharacteristic) {
        txCharacteristic.removeEventListener(
            "characteristicvaluechanged",
            onBLEDataReceived
        );
    }

    if (bleDevice && bleDevice.gatt && bleDevice.gatt.connected) {
        bleDevice.gatt.disconnect();
    } else {
        txCharacteristic = null;
        setStatus("Disconnected.");
    }
}
