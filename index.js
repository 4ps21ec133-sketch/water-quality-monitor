
"use strict";

// =====================================================
// ESP32 WATER QUALITY MONITOR
// ESP32 BLE -> GOOGLE CHROME WEBSITE
// =====================================================

// BLE SETTINGS — MUST MATCH ESP32

const DEVICE_NAME = "Water Quality Monitor";

const SERVICE_UUID =
    "6e400001-b5a3-f393-e0a9-e50e24dcca9e";

const TX_UUID =
    "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

// =====================================================
// HTML ELEMENTS
// =====================================================

const $ = (id) => document.getElementById(id);

const connectButton = $("connectButton");
const buttonText = $("buttonText");
const buttonIcon = $("buttonIcon");
const bluetoothIcon = $("bluetoothIcon");
const statusElement = $("status");
const rawDataElement = $("rawData");

const tdsElement = $("tds");
const turbidityElement = $("turbidity");
const temperatureElement = $("temperature");
const qualityElement = $("quality");

// =====================================================
// BLE VARIABLES
// =====================================================

let bluetoothDevice = null;
let txCharacteristic = null;
let isConnecting = false;

// Used only if a message is split across notifications.
let receivedData = "";

// =====================================================
// STATUS DISPLAY
// =====================================================

function setStatus(message, connected = false) {
    console.log("STATUS:", message);

    if (statusElement) {
        statusElement.innerText = message;
    }

    if (buttonText) {
        buttonText.innerText = connected
            ? "BLUETOOTH CONNECTED"
            : "CONNECT BLUETOOTH";
    }

    if (buttonIcon) {
        buttonIcon.innerText = connected ? "🟢" : "🔵";
    }

    if (bluetoothIcon) {
        bluetoothIcon.classList.toggle("connected", connected);
        bluetoothIcon.classList.toggle("disconnected", !connected);
    }
}

// =====================================================
// BLUETOOTH SUPPORT CHECK
// =====================================================

function checkBluetooth() {
    if (!window.isSecureContext) {
        setStatus("ERROR: Open website using HTTPS");
        return false;
    }

    if (!navigator.bluetooth) {
        setStatus("ERROR: Web Bluetooth unavailable");
        return false;
    }

    return true;
}

// =====================================================
// CONNECT BLUETOOTH
// =====================================================

async function connectBluetooth() {
    if (isConnecting) return;

    if (bluetoothDevice?.gatt?.connected) {
        bluetoothDevice.gatt.disconnect();
        return;
    }

    if (!checkBluetooth()) return;

    isConnecting = true;

    if (connectButton) connectButton.disabled = true;

    try {
        setStatus("Searching for ESP32...");

        bluetoothDevice = await navigator.bluetooth.requestDevice({
            filters: [{ name: DEVICE_NAME }],
            optionalServices: [SERVICE_UUID]
        });

        bluetoothDevice.removeEventListener(
            "gattserverdisconnected",
            handleDisconnect
        );

        bluetoothDevice.addEventListener(
            "gattserverdisconnected",
            handleDisconnect
        );

        setStatus("Connecting to ESP32...");

        const server = await bluetoothDevice.gatt.connect();

        console.log("GATT connected");

        const service =
            await server.getPrimaryService(SERVICE_UUID);

        console.log("BLE service found");

        txCharacteristic =
            await service.getCharacteristic(TX_UUID);

        console.log("TX characteristic found");

        await txCharacteristic.startNotifications();

        txCharacteristic.removeEventListener(
            "characteristicvaluechanged",
            handleBLEData
        );

        txCharacteristic.addEventListener(
            "characteristicvaluechanged",
            handleBLEData
        );

        receivedData = "";

        setStatus("Bluetooth Connected", true);

        console.log("BLE notifications started");

    } catch (error) {
        console.error("BLE CONNECTION ERROR:", error);

        setStatus("Connection failed: " + error.message);

    } finally {
        isConnecting = false;

        if (connectButton) {
            connectButton.disabled = false;
        }
    }
}

// =====================================================
// RECEIVE BLE NOTIFICATIONS
// =====================================================

function handleBLEData(event) {
    const value = event.target.value;

    const bytes = new Uint8Array(
        value.buffer,
        value.byteOffset,
        value.byteLength
    );

    const chunk = new TextDecoder("utf-8").decode(bytes);

    console.log("BLE NOTIFICATION:", JSON.stringify(chunk));

    // Current ESP32 code sends the entire packet in one
    // notification and has no message terminator.
    //
    // Parse immediately when all expected fields are present.
    // Otherwise, retain the data until the next notification.

    receivedData += chunk;

    if (rawDataElement) {
        rawDataElement.innerText = receivedData;
    }

    const hasAllFields =
        /TDS:\s*-?\d+/i.test(receivedData) &&
        /TURB:\s*-?\d+/i.test(receivedData) &&
        /TEMP:\s*-?\d+(?:\.\d+)?/i.test(receivedData) &&
        /Q:\s*[A-Za-z]+/i.test(receivedData);

    if (hasAllFields) {
        parseBLEData(receivedData);

        // Current ESP32 sends a fresh complete packet every
        // 2 seconds, so clear the buffer after parsing.
        receivedData = "";
    }

    // Prevent unlimited growth if incoming data is malformed.
    if (receivedData.length > 1000) {
        console.warn("BLE receive buffer reset");
        receivedData = "";
    }
}

// =====================================================
// PARSE SENSOR DATA
// Expected format:
// TDS:378,TURB:1250,TEMP:27.50,Q:GOOD
// =====================================================

function parseBLEData(data) {
    console.log("COMPLETE SENSOR DATA:", data);

    const tdsMatch = data.match(/TDS:\s*(-?\d+)/i);
    const turbMatch = data.match(/TURB:\s*(-?\d+)/i);

    const tempMatch = data.match(
        /TEMP:\s*(-?\d+(?:\.\d+)?)/i
    );

    const qualityMatch = data.match(
        /Q:\s*([A-Za-z]+)/i
    );

    if (tdsMatch && tdsElement) {
        tdsElement.innerText = tdsMatch[1];
    }

    if (turbMatch && turbidityElement) {
        turbidityElement.innerText = turbMatch[1];
    }

    if (tempMatch && temperatureElement) {
        const temperature = parseFloat(tempMatch[1]);

        temperatureElement.innerText =
            Number.isFinite(temperature)
                ? temperature.toFixed(2) + " °C"
                : "--";
    }

    if (qualityMatch && qualityElement) {
        const quality = qualityMatch[1].toUpperCase();

        qualityElement.innerText = quality;
        updateQualityStyle(quality);
    }

    console.log("Sensor values updated");
}

// =====================================================
// WATER QUALITY STYLE
// =====================================================

function updateQualityStyle(quality) {
    const qualityCard = $("qualityCard");

    if (qualityCard) {
        qualityCard.classList.remove(
            "quality-pure",
            "quality-excellent",
            "quality-good",
            "quality-fair",
            "quality-high"
        );

        const styles = {
            PURE: "quality-pure",
            EXCELLENT: "quality-excellent",
            GOOD: "quality-good",
            FAIR: "quality-fair",
            HIGH: "quality-high"
        };

        if (styles[quality]) {
            qualityCard.classList.add(styles[quality]);
        }
    }

    const qualityIcon = $("qualityIcon");

    if (qualityIcon) {
        qualityIcon.innerText =
            ["PURE", "EXCELLENT", "GOOD"].includes(quality)
                ? "✓"
                : "!";
    }
}

// =====================================================
// DISCONNECT HANDLER
// =====================================================

function handleDisconnect() {
    console.log("ESP32 disconnected");

    txCharacteristic = null;
    receivedData = "";

    setStatus("Bluetooth Disconnected");

    if (connectButton) {
        connectButton.disabled = false;
    }
}

// =====================================================
// BUTTON EVENT
// =====================================================

if (connectButton) {
    connectButton.addEventListener(
        "click",
        connectBluetooth
    );
} else {
    console.error("Missing HTML element: connectButton");
}

// =====================================================
// PAGE INITIALIZATION
// =====================================================

window.addEventListener("load", () => {
    console.log("Water Quality Monitor loaded");

    if (statusElement) {
        setStatus("Ready — connect Bluetooth");
    }

    checkBluetooth();
});

// =====================================================
// CLEANUP
// =====================================================

window.addEventListener("beforeunload", () => {
    if (bluetoothDevice?.gatt?.connected) {
        bluetoothDevice.gatt.disconnect();
    }
});
