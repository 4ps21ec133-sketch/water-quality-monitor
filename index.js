// ============================================================
// WATER QUALITY MONITOR
// ESP32 BLE + ANDROID WEB BLUETOOTH
// ============================================================


// ============================================================
// ESP32 BLE DETAILS
// ============================================================

const DEVICE_NAME = "Water Quality Monitor";

const SERVICE_UUID =
    "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";

const RX_UUID =
    "6E400002-B5A3-F393-E0A9-E50E24DCCA9E";

const TX_UUID =
    "6E400003-B5A3-F393-E0A9-E50ECCA9E";


// IMPORTANT:
// Correct TX UUID
const CORRECT_TX_UUID =
    "6E400003-B5A3-F393-E0A9-E50E24DCCA9E";


// ============================================================
// HTML ELEMENTS
// ============================================================

const connectButton =
    document.getElementById("connectButton");

const buttonText =
    document.getElementById("buttonText");

const buttonIcon =
    document.getElementById("buttonIcon");

const statusElement =
    document.getElementById("status");

const bluetoothIcon =
    document.getElementById("bluetoothIcon");

const tdsElement =
    document.getElementById("tds");

const turbidityElement =
    document.getElementById("turbidity");

const temperatureElement =
    document.getElementById("temperature");

const qualityElement =
    document.getElementById("quality");

const qualityCard =
    document.getElementById("qualityCard");

const qualityIcon =
    document.getElementById("qualityIcon");

const rawDataElement =
    document.getElementById("rawData");


// ============================================================
// BLE VARIABLES
// ============================================================

let bluetoothDevice = null;
let bleServer = null;
let txCharacteristic = null;


// ============================================================
// CURRENT SENSOR DATA
// ============================================================

let currentTDS = null;
let currentTurbidity = null;
let currentTemperature = null;
let currentQuality = null;


// ============================================================
// CHECK WEB BLUETOOTH
// ============================================================

function checkBluetoothSupport() {

    console.log("================================");
    console.log("WEB BLUETOOTH CHECK");
    console.log("================================");

    console.log(
        "navigator.bluetooth:",
        navigator.bluetooth
    );

    console.log(
        "Secure context:",
        window.isSecureContext
    );

    console.log(
        "User agent:",
        navigator.userAgent
    );


    if (!window.isSecureContext) {

        statusElement.innerText =
            "HTTPS required";

        rawDataElement.innerText =
            "ERROR: Website is not running in a secure context.";

        connectButton.disabled = true;

        return false;
    }


    if (!navigator.bluetooth) {

        statusElement.innerText =
            "Bluetooth not supported";

        rawDataElement.innerText =
            "ERROR: Web Bluetooth is not available in this browser.";

        connectButton.disabled = true;

        return false;
    }


    statusElement.innerText =
        "Bluetooth Ready";


    rawDataElement.innerText =
        "Web Bluetooth is supported. Press Connect.";


    return true;
}


// ============================================================
// CONNECT BUTTON
// ============================================================

connectButton.addEventListener(
    "click",
    async function () {

        console.log(
            "CONNECT BUTTON PRESSED"
        );


        if (
            bluetoothDevice &&
            bluetoothDevice.gatt &&
            bluetoothDevice.gatt.connected
        ) {

            disconnectBluetooth();

        } else {

            await connectBluetooth();

        }

    }
);


// ============================================================
// CONNECT BLUETOOTH
// ============================================================

async function connectBluetooth() {

    if (!checkBluetoothSupport()) {
        return;
    }


    try {

        setConnecting();


        console.log("");
        console.log("===============================");
        console.log("STEP 1: REQUESTING BLE DEVICE");
        console.log("===============================");


        // ====================================================
        // OPEN ANDROID BLUETOOTH SELECTOR
        // ====================================================

        bluetoothDevice =
            await navigator.bluetooth.requestDevice({

                filters: [

                    {
                        namePrefix:
                            DEVICE_NAME
                    }

                ],

                optionalServices: [
                    SERVICE_UUID
                ]

            });


        console.log(
            "DEVICE SELECTED"
        );

        console.log(
            "Name:",
            bluetoothDevice.name
        );

        console.log(
            "ID:",
            bluetoothDevice.id
        );


        rawDataElement.innerText =
            "Selected: " +
            (bluetoothDevice.name || "Unknown device");


        // ====================================================
        // DISCONNECT EVENT
        // ====================================================

        bluetoothDevice.addEventListener(
            "gattserverdisconnected",
            handleDisconnect
        );


        // ====================================================
        // CONNECT GATT
        // ====================================================

        statusElement.innerText =
            "Connecting to ESP32...";


        console.log("");
        console.log("===============================");
        console.log("STEP 2: CONNECTING TO GATT");
        console.log("===============================");


        if (!bluetoothDevice.gatt) {

            throw new Error(
                "This BLE device does not provide GATT."
            );
        }


        bleServer =
            await bluetoothDevice.gatt.connect();


        console.log(
            "GATT CONNECTED"
        );


        statusElement.innerText =
            "GATT connected";


        rawDataElement.innerText =
            "GATT connection successful.";


        // ====================================================
        // GET SERVICE
        // ====================================================

        console.log("");
        console.log("===============================");
        console.log("STEP 3: FINDING BLE SERVICE");
        console.log("===============================");


        console.log(
            "Service UUID:",
            SERVICE_UUID
        );


        const service =
            await bleServer.getPrimaryService(
                SERVICE_UUID
            );


        console.log(
            "SERVICE FOUND"
        );


        // ====================================================
        // GET TX CHARACTERISTIC
        // ====================================================

        console.log("");
        console.log("===============================");
        console.log("STEP 4: FINDING TX CHARACTERISTIC");
        console.log("===============================");


        console.log(
            "TX UUID:",
            CORRECT_TX_UUID
        );


        txCharacteristic =
            await service.getCharacteristic(
                CORRECT_TX_UUID
            );


        console.log(
            "TX CHARACTERISTIC FOUND"
        );


        // ====================================================
        // ENABLE NOTIFICATIONS
        // ====================================================

        console.log("");
        console.log("===============================");
        console.log("STEP 5: STARTING NOTIFICATIONS");
        console.log("===============================");


        txCharacteristic.addEventListener(
            "characteristicvaluechanged",
            handleBLEData
        );


        await txCharacteristic.startNotifications();


        console.log(
            "NOTIFICATIONS ENABLED"
        );


        // ====================================================
        // CONNECTED
        // ====================================================

        setConnected();


        rawDataElement.innerText =
            "Connected. Waiting for ESP32 data...";


        console.log("");
        console.log("===============================");
        console.log("BLE CONNECTION SUCCESSFUL");
        console.log("===============================");


    }

    catch (error) {

        console.error("");
        console.error(
            "================================"
        );

        console.error(
            "BLUETOOTH CONNECTION ERROR"
        );

        console.error(
            "================================"
        );

        console.error(
            "Name:",
            error.name
        );

        console.error(
            "Message:",
            error.message
        );

        console.error(
            "Full error:",
            error
        );


        let message =
            "Bluetooth connection failed.";


        // ====================================================
        // ERROR TYPES
        // ====================================================

        if (
            error.name ===
            "NotFoundError"
        ) {

            message =
                "No ESP32 selected.";

            rawDataElement.innerText =
                "No Bluetooth device was selected.";

        }


        else if (
            error.name ===
            "SecurityError"
        ) {

            message =
                "Bluetooth permission denied.";

            rawDataElement.innerText =
                "Chrome blocked Bluetooth permission.";

        }


        else if (
            error.name ===
            "NetworkError"
        ) {

            message =
                "GATT connection failed.";

            rawDataElement.innerText =
                "ESP32 could not be connected. Make sure no other phone/app is connected.";

        }


        else if (
            error.name ===
            "InvalidStateError"
        ) {

            message =
                "Bluetooth state error.";

            rawDataElement.innerText =
                "Bluetooth is already busy or the ESP32 is in an invalid connection state.";

        }


        else if (
            error.name ===
            "NotSupportedError"
        ) {

            message =
                "Bluetooth not supported.";

            rawDataElement.innerText =
                "This browser/device does not support the required BLE operation.";

        }


        else {

            message =
                error.name +
                ": " +
                error.message;

            rawDataElement.innerText =
                "ERROR: " +
                error.name +
                " - " +
                error.message;
        }


        statusElement.innerText =
            message;


        bluetoothDevice = null;
        bleServer = null;
        txCharacteristic = null;


        setDisconnected();
    }
}


// ============================================================
// BLE DATA RECEIVED
// ============================================================

function handleBLEData(event) {

    try {

        const value =
            event.target.value;


        const decoder =
            new TextDecoder("utf-8");


        const packet =
            decoder
                .decode(value)
                .trim();


        console.log(
            "ESP32 BLE DATA:",
            packet
        );


        if (!packet) {
            return;
        }


        rawDataElement.innerText =
            "Received: " +
            packet;


        // ====================================================
        // TDS + TURBIDITY
        // ====================================================

        if (
            packet.includes("TDS:")
        ) {

            processSensorPacket(
                packet
            );
        }


        // ====================================================
        // TEMPERATURE + QUALITY
        // ====================================================

        if (
            packet.includes("TEMP:")
        ) {

            processTemperaturePacket(
                packet
            );
        }

    }

    catch (error) {

        console.error(
            "BLE DATA ERROR:",
            error
        );

        rawDataElement.innerText =
            "Data error: " +
            error.message;
    }
}


// ============================================================
// PROCESS TDS + TURBIDITY
// ============================================================

function processSensorPacket(packet) {

    console.log(
        "Processing sensor packet:",
        packet
    );


    const parts =
        packet.split(",");


    parts.forEach(
        function(part) {

            part =
                part.trim();


            // TDS
            if (
                part.startsWith("TDS:")
            ) {

                const value =
                    part.substring(4).trim();


                currentTDS =
                    Number(value);


                tdsElement.innerText =
                    value;


                console.log(
                    "TDS =",
                    value
                );
            }


            // TURBIDITY
            if (
                part.startsWith("TURB:")
            ) {

                const value =
                    part.substring(5).trim();


                currentTurbidity =
                    Number(value);


                turbidityElement.innerText =
                    value;


                console.log(
                    "TURBIDITY =",
                    value
                );
            }

        }
    );
}


// ============================================================
// PROCESS TEMPERATURE + QUALITY
// ============================================================

function processTemperaturePacket(packet) {

    console.log(
        "Processing temperature packet:",
        packet
    );


    const parts =
        packet.split(",");


    parts.forEach(
        function(part) {

            part =
                part.trim();


            // TEMPERATURE
            if (
                part.startsWith("TEMP:")
            ) {

                const value =
                    part.substring(5).trim();


                currentTemperature =
                    value;


                temperatureElement.innerText =
                    value;


                console.log(
                    "TEMPERATURE =",
                    value
                );
            }


            // QUALITY
            if (
                part.startsWith("Q:")
            ) {

                const value =
                    part.substring(2).trim();


                currentQuality =
                    value;


                updateQuality(
                    value
                );


                console.log(
                    "QUALITY =",
                    value
                );
            }

        }
    );
}


// ============================================================
// UPDATE QUALITY
// ============================================================

function updateQuality(value) {

    const quality =
        value.toUpperCase();


    qualityElement.innerText =
        quality;


    qualityCard.classList.remove(
        "quality-pure",
        "quality-excellent",
        "quality-good",
        "quality-fair",
        "quality-high"
    );


    switch (quality) {

        case "PURE":

            qualityCard.classList.add(
                "quality-pure"
            );

            qualityElement.style.color =
                "#3b82f6";

            qualityIcon.style.color =
                "#3b82f6";

            break;


        case "EXCELLENT":

            qualityCard.classList.add(
                "quality-excellent"
            );

            qualityElement.style.color =
                "white";

            qualityIcon.style.color =
                "white";

            break;


        case "GOOD":

            qualityCard.classList.add(
                "quality-good"
            );

            qualityElement.style.color =
                "#facc15";

            qualityIcon.style.color =
                "#facc15";

            break;


        case "FAIR":

            qualityCard.classList.add(
                "quality-fair"
            );

            qualityElement.style.color =
                "#22c55e";

            qualityIcon.style.color =
                "#22c55e";

            break;


        case "HIGH":

            qualityCard.classList.add(
                "quality-high"
            );

            qualityElement.style.color =
                "#06b6d4";

            qualityIcon.style.color =
                "#06b6d4";

            break;


        default:

            qualityElement.style.color =
                "#9ca3af";

            qualityIcon.style.color =
                "#9ca3af";
    }
}


// ============================================================
// CONNECTING UI
// ============================================================

function setConnecting() {

    statusElement.innerText =
        "Select ESP32...";


    buttonIcon.innerText =
        "⏳";


    buttonText.innerText =
        "SELECT ESP32...";


    connectButton.disabled =
        true;
}


// ============================================================
// CONNECTED UI
// ============================================================

function setConnected() {

    statusElement.innerText =
        "Connected to ESP32";


    bluetoothIcon.classList.remove(
        "disconnected"
    );


    bluetoothIcon.classList.add(
        "connected"
    );


    buttonIcon.innerText =
        "🔴";


    buttonText.innerText =
        "DISCONNECT";


    connectButton.disabled =
        false;
}


// ============================================================
// DISCONNECTED UI
// ============================================================

function setDisconnected() {

    statusElement.innerText =
        "Disconnected";


    bluetoothIcon.classList.remove(
        "connected"
    );


    bluetoothIcon.classList.add(
        "disconnected"
    );


    buttonIcon.innerText =
        "🔵";


    buttonText.innerText =
        "CONNECT BLUETOOTH";


    connectButton.disabled =
        false;
}


// ============================================================
// DISCONNECT
// ============================================================

function disconnectBluetooth() {

    console.log(
        "Disconnecting ESP32..."
    );


    try {

        if (
            txCharacteristic
        ) {

            txCharacteristic.removeEventListener(
                "characteristicvaluechanged",
                handleBLEData
            );
        }


        if (
            bluetoothDevice &&
            bluetoothDevice.gatt &&
            bluetoothDevice.gatt.connected
        ) {

            bluetoothDevice.gatt.disconnect();
        }

    }

    catch(error) {

        console.error(
            "Disconnect error:",
            error
        );
    }


    bluetoothDevice = null;
    bleServer = null;
    txCharacteristic = null;


    setDisconnected();


    rawDataElement.innerText =
        "Disconnected.";
}


// ============================================================
// ESP32 DISCONNECTED
// ============================================================

function handleDisconnect() {

    console.log(
        "ESP32 GATT disconnected."
    );


    bluetoothDevice = null;
    bleServer = null;
    txCharacteristic = null;


    setDisconnected();


    rawDataElement.innerText =
        "ESP32 disconnected.";
}


// ============================================================
// PAGE START
// ============================================================

window.addEventListener(
    "load",
    function() {

        console.log(
            "Water Quality Monitor started."
        );


        checkBluetoothSupport();

    }
);
