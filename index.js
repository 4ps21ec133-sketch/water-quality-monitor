// =====================================================
// WATER QUALITY MONITOR - ESP32 BLE
// =====================================================

// ESP32 BLE device name
const DEVICE_NAME = "Water Quality Monitor";

// BLE Service UUID
const SERVICE_UUID =
    "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
// ESP32 -> Phone
const TX_UUID =
    "6e400003-b5a3-f393-e0a9-e50e24dcca9e";


// =====================================================
// HTML ELEMENTS
// =====================================================

const connectButton =
    document.getElementById("connectButton");

const buttonText =
    document.getElementById("buttonText");

const statusElement =
    document.getElementById("status");

const rawDataElement =
    document.getElementById("rawData");

const tdsElement =
    document.getElementById("tds");

const turbidityElement =
    document.getElementById("turbidity");

const temperatureElement =
    document.getElementById("temperature");

const qualityElement =
    document.getElementById("quality");


// =====================================================
// BLE VARIABLES
// =====================================================

let bluetoothDevice = null;
let txCharacteristic = null;


// =====================================================
// STATUS
// =====================================================

function setStatus(message)
{
    console.log(message);

    if (statusElement)
    {
        statusElement.innerText = message;
    }

    if (rawDataElement)
    {
        rawDataElement.innerText = message;
    }
}


// =====================================================
// BLUETOOTH SUPPORT CHECK
// =====================================================

function checkBluetooth()
{
    console.log("Checking Web Bluetooth...");

    console.log(
        "Secure:",
        window.isSecureContext
    );

    console.log(
        "Bluetooth:",
        navigator.bluetooth
    );

    if (!window.isSecureContext)
    {
        setStatus(
            "ERROR: Website must use HTTPS"
        );

        return false;
    }

    if (!navigator.bluetooth)
    {
        setStatus(
            "ERROR: Web Bluetooth not supported"
        );

        return false;
    }

    return true;
}


// =====================================================
// CONNECT BUTTON
// =====================================================

connectButton.addEventListener(
    "click",
    connectBluetooth
);


// =====================================================
// CONNECT BLUETOOTH
// =====================================================

async function connectBluetooth()
{
    console.log("");
    console.log("==============================");
    console.log("CONNECT BUTTON PRESSED");
    console.log("==============================");

    if (!checkBluetooth())
    {
        return;
    }

    try
    {
        connectButton.disabled = true;

        buttonText.innerText =
            "SEARCHING...";

        setStatus(
            "Searching for ESP32..."
        );


        // =================================================
        // STEP 1
        // FIND ESP32
        // =================================================

        console.log(
            "STEP 1: Searching for device..."
        );

        bluetoothDevice =
            await navigator.bluetooth.requestDevice(
            {
                filters:
                [
                    {
                        namePrefix:
                            "Water Quality Monitor"
                    }
                ],

                optionalServices:
                [
                    SERVICE_UUID
                ]
            });


        console.log(
            "ESP32 FOUND:",
            bluetoothDevice.name
        );

        setStatus(
            "Found: " +
            bluetoothDevice.name
        );


        // =================================================
        // DISCONNECT EVENT
        // =================================================

        bluetoothDevice.addEventListener(
            "gattserverdisconnected",
            handleDisconnect
        );


        // =================================================
        // STEP 2
        // CONNECT GATT
        // =================================================

        buttonText.innerText =
            "CONNECTING...";

        setStatus(
            "Connecting to ESP32..."
        );

        console.log(
            "STEP 2: Connecting GATT..."
        );

        const server =
            await bluetoothDevice.gatt.connect();


        console.log(
            "GATT CONNECTION SUCCESS"
        );


        // =================================================
        // STEP 3
        // GET SERVICE
        // =================================================

        setStatus(
            "Finding BLE service..."
        );

        console.log(
            "STEP 3: Finding service..."
        );

        const service =
            await server.getPrimaryService(
                SERVICE_UUID
            );


        console.log(
            "SERVICE FOUND"
        );


        // =================================================
        // STEP 4
        // GET TX CHARACTERISTIC
        // =================================================

        setStatus(
            "Finding sensor data..."
        );

        console.log(
            "STEP 4: Finding TX characteristic..."
        );

        txCharacteristic =
            await service.getCharacteristic(
                TX_UUID
            );


        console.log(
            "TX CHARACTERISTIC FOUND"
        );


        // =================================================
        // STEP 5
        // START NOTIFICATIONS
        // =================================================

        setStatus(
            "Starting live sensor data..."
        );

        console.log(
            "STEP 5: Starting notifications..."
        );

        await txCharacteristic.startNotifications();


        txCharacteristic.addEventListener(
            "characteristicvaluechanged",
            handleBLEData
        );


        console.log(
            "NOTIFICATIONS STARTED"
        );


        // =================================================
        // SUCCESS
        // =================================================

        setStatus(
            "Bluetooth Connected"
        );

        buttonText.innerText =
            "DISCONNECT BLUETOOTH";

        connectButton.disabled = false;


        console.log("");
        console.log("==============================");
        console.log("BLE CONNECTION SUCCESS");
        console.log("==============================");

    }
    catch (error)
    {
        console.error(
            "BLE ERROR:",
            error
        );

        connectButton.disabled = false;

        buttonText.innerText =
            "CONNECT BLUETOOTH";

        showBluetoothError(error);
    }
}


// =====================================================
// BLUETOOTH ERROR
// =====================================================

function showBluetoothError(error)
{
    let message =
        "Bluetooth connection failed";

    console.log(
        "ERROR NAME:",
        error.name
    );

    console.log(
        "ERROR MESSAGE:",
        error.message
    );


    if (error.name === "NotFoundError")
    {
        message =
            "ESP32 not selected or not found";
    }

    else if (error.name === "SecurityError")
    {
        message =
            "Bluetooth permission denied";
    }

    else if (error.name === "NotSupportedError")
    {
        message =
            "Web Bluetooth is not supported";
    }

    else if (error.name === "NetworkError")
    {
        message =
            "ESP32 BLE connection failed";
    }

    else if (error.name === "InvalidStateError")
    {
        message =
            "Bluetooth is already connected";
    }

    else if (error.message)
    {
        message =
            error.name +
            ": " +
            error.message;
    }


    setStatus(message);
}


// =====================================================
// BLE DATA RECEIVED
// =====================================================

function handleBLEData(event)
{
    const decoder =
        new TextDecoder("utf-8");

    const data =
        decoder.decode(
            event.target.value
        );


    console.log(
        "BLE DATA RECEIVED:",
        data
    );


    // Show raw packet
    rawDataElement.innerText =
        data;


    parseBLEData(data);
}


// =====================================================
// PARSE ESP32 PACKET
// =====================================================
//
// ESP32 sends:
//
// TDS:378,TURB:1250,Q:GOOD
//
// =====================================================

function parseBLEData(data)
{
    // ---------------------------------------------------
    // TDS
    // ---------------------------------------------------

    const tdsMatch =
        data.match(
            /TDS:([0-9]+)/
        );

    if (tdsMatch)
    {
        const tds =
            tdsMatch[1];

        tdsElement.innerText =
            tds;

        console.log(
            "TDS:",
            tds
        );
    }


    // ---------------------------------------------------
    // TURBIDITY
    // ---------------------------------------------------

    const turbidityMatch =
        data.match(
            /TURB:([0-9]+)/
        );

    if (turbidityMatch)
    {
        const turbidity =
            turbidityMatch[1];

        turbidityElement.innerText =
            turbidity;

        console.log(
            "Turbidity:",
            turbidity
        );
    }


    // ---------------------------------------------------
    // QUALITY
    // ---------------------------------------------------

    const qualityMatch =
        data.match(
            /Q:([A-Za-z]+)/
        );

    if (qualityMatch)
    {
        const quality =
            qualityMatch[1];

        qualityElement.innerText =
            quality;

        console.log(
            "Quality:",
            quality
        );
    }


    // ---------------------------------------------------
    // TEMPERATURE
    // ---------------------------------------------------
    //
    // Your current ESP32 code DOES NOT send temperature.
    //
    // Therefore we don't change temperature here.
    //
}


// =====================================================
// DISCONNECTED
// =====================================================

function handleDisconnect()
{
    console.log(
        "ESP32 disconnected"
    );

    setStatus(
        "Bluetooth Disconnected"
    );

    buttonText.innerText =
        "CONNECT BLUETOOTH";

    connectButton.disabled =
        false;

    txCharacteristic =
        null;
}


// =====================================================
// PAGE LOADED
// =====================================================

window.addEventListener(
    "load",
    function()
    {
        console.log(
            "Water Quality Monitor loaded"
        );

        checkBluetooth();
    }
);
