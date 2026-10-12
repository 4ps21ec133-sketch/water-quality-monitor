// =====================================================
// WATER QUALITY MONITOR
// ESP32 BLE -> GOOGLE CHROME WEBSITE
// =====================================================

const SERVICE_UUID =
    "6e400001-b5a3-f393-e0a9-e50e24dcca9e";

const RX_UUID =
    "6e400002-b5a3-f393-e0a9-e50e24dcca9e";

const TX_UUID =
    "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

const $ = id => document.getElementById(id);

let bleDevice = null;
let bleServer = null;
let txCharacteristic = null;
let receivedData = "";

const connectButton = $("connectButton");
const statusElement = $("status");
const buttonText = $("buttonText");
const buttonIcon = $("buttonIcon");
const bluetoothIcon = $("bluetoothIcon");
const rawDataElement = $("rawData");

function setStatus(message, connected = false) {
    statusElement.innerText = message;

    bluetoothIcon.classList.toggle(
        "connected", connected
    );

    bluetoothIcon.classList.toggle(
        "disconnected", !connected
    );

    buttonText.innerText = connected
        ? "BLUETOOTH CONNECTED"
        : "CONNECT BLUETOOTH";

    buttonIcon.innerText = connected ? "🟢" : "🔵";
}

function parseBLEData(data) {
    if (!data) return;

    rawDataElement.innerText = data;

    const tds = data.match(/TDS:\s*(-?\d+)/i);
    const turb = data.match(/TURB:\s*(-?\d+)/i);
    const temp = data.match(/TEMP:\s*(-?\d+(?:\.\d+)?)/i);
    const quality = data.match(/Q:\s*([A-Za-z]+)/i);

    if (tds) $("tds").innerText = tds[1];
    if (turb) $("turbidity").innerText = turb[1];

    if (temp) {
        $("temperature").innerText =
            parseFloat(temp[1]).toFixed(2) + " °C";
    }

    if (quality) {
        const q = quality[1].toUpperCase();
        $("quality").innerText = q;
        updateQualityStyle(q);
    }
}

function updateQualityStyle(quality) {
    const card = $("qualityCard");

    card.classList.remove(
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
        card.classList.add(styles[quality]);
    }

    $("qualityIcon").innerText =
        ["PURE", "EXCELLENT", "GOOD"].includes(quality)
            ? "✓" : "!";
}

// Handles incoming BLE notification data.
// Supports messages split across multiple notifications.
function handleNotification(event) {
    const value = event.target.value;
    const bytes = new Uint8Array(
        value.buffer,
        value.byteOffset,
        value.byteLength
    );

    for (const byte of bytes) {
        const char = String.fromCharCode(byte);

        if (char === "#") {
            const completeMessage = receivedData.trim();
            receivedData = "";

            if (completeMessage) {
                parseBLEData(completeMessage);
            }
        } else if (char === "\n" || char === "\r") {
            // Ignore line endings between chunks.
        } else {
            receivedData += char;
        }
    }

    // Also accept complete messages ending with newline
    // when the ESP32 does not use the # terminator.
    // The ESP32's # terminator is preferred.
}

async function connectBluetooth() {
    if (!navigator.bluetooth) {
        setStatus(
            "Web Bluetooth unavailable. Open this page in supported Chrome over HTTPS."
        );
        return;
    }

    try {
        connectButton.disabled = true;
        setStatus("Searching for ESP32...");

        bleDevice = await navigator.bluetooth.requestDevice({
            filters: [{ name: "Water Quality Monitor" }],
            optionalServices: [SERVICE_UUID]
        });

        bleDevice.addEventListener(
            "gattserverdisconnected",
            () => {
                txCharacteristic = null;
                bleServer = null;
                receivedData = "";
                setStatus("Bluetooth disconnected");
            }
        );

        setStatus("Connecting to ESP32...");

        bleServer = await bleDevice.gatt.connect();

        const service =
            await bleServer.getPrimaryService(SERVICE_UUID);

        txCharacteristic =
            await service.getCharacteristic(TX_UUID);

        await txCharacteristic.startNotifications();

        txCharacteristic.addEventListener(
            "characteristicvaluechanged",
            handleNotification
        );

        setStatus("Bluetooth Connected", true);

    } catch (error) {
        console.error("BLE connection error:", error);

        setStatus("Connection failed: " + error.message);
    } finally {
        connectButton.disabled = false;
    }
}

connectButton.addEventListener(
    "click",
    connectBluetooth
);

window.addEventListener("load", () => {
    setStatus("Ready — connect Bluetooth");
    console.log("Water Quality Monitor loaded");
});

window.addEventListener("beforeunload", () => {
    if (bleDevice && bleDevice.gatt.connected) {
        bleDevice.gatt.disconnect();
    }
});
