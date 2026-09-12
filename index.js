// ============================================================
// WATER QUALITY MONITOR
// ESP32 BLE MOBILE WEB APP
// ============================================================


// ============================================================
// ESP32 BLE DETAILS
// ============================================================

const DEVICE_NAME =
    "Water Quality Monitor";


const SERVICE_UUID =
    "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";


const RX_UUID =
    "6E400002-B5A3-F393-E0A9-E50E24DCCA9E";


const TX_UUID =
    "6E400003-B5A3-F393-E0A9-E50E24DCCA9E";


// ============================================================
// HTML ELEMENTS
// ============================================================

const connectButton =
    document.getElementById(
        "connectButton"
    );


const buttonText =
    document.getElementById(
        "buttonText"
    );


const buttonIcon =
    document.getElementById(
        "buttonIcon"
    );


const statusElement =
    document.getElementById(
        "status"
    );


const bluetoothIcon =
    document.getElementById(
        "bluetoothIcon"
    );


const tdsElement =
    document.getElementById(
        "tds"
    );


const turbidityElement =
    document.getElementById(
        "turbidity"
    );


const temperatureElement =
    document.getElementById(
        "temperature"
    );


const qualityElement =
    document.getElementById(
        "quality"
    );


const qualityCard =
    document.getElementById(
        "qualityCard"
    );


const qualityIcon =
    document.getElementById(
        "qualityIcon"
    );


const rawDataElement =
    document.getElementById(
        "rawData"
    );


// ============================================================
// BLE VARIABLES
// ============================================================

let bluetoothDevice = null;

let bleServer = null;

let txCharacteristic = null;


// ============================================================
// CURRENT DATA
// ============================================================

let currentTDS = null;

let currentTurbidity = null;

let currentTemperature = null;

let currentQuality = null;


// ============================================================
// CHECK WEB BLUETOOTH
// ============================================================

function checkBluetoothSupport() {

    if (!navigator.bluetooth) {

        statusElement.innerText =
            "Web Bluetooth not supported";

        connectButton.disabled =
            true;

        alert(
            "This browser does not support Web Bluetooth. " +
            "Use Chrome on Android."
        );

        return false;
    }

    return true;
}


// ============================================================
// CONNECT BUTTON
// ============================================================

connectButton.addEventListener(
    "click",
    async function () {

        if (bluetoothDevice) {

            disconnectBluetooth();

        } else {

            await connectBluetooth();

        }

    }
);


// ============================================================
// CONNECT TO ESP32
// ============================================================

async function connectBluetooth() {

    if (!checkBluetoothSupport()) {
        return;
    }


    try {

        setConnecting();


        // ----------------------------------------------------
        // OPEN BLUETOOTH DEVICE SELECTOR
        // ----------------------------------------------------

        bluetoothDevice =
            await navigator.bluetooth.requestDevice({

                filters: [

                    {
                        name:
                            DEVICE_NAME
                    }

                ],

                optionalServices: [

                    SERVICE_UUID

                ]

            });


        console.log(
            "Device selected:",
            bluetoothDevice.name
        );


        // ----------------------------------------------------
        // DISCONNECT EVENT
        // ----------------------------------------------------

        bluetoothDevice.addEventListener(
            "gattserverdisconnected",
            handleDisconnect
        );


        // ----------------------------------------------------
        // CONNECT GATT
        // ----------------------------------------------------

        statusElement.innerText =
            "Connecting...";


        bleServer =
            await bluetoothDevice.gatt.connect();


        console.log(
            "GATT connected"
        );


        // ----------------------------------------------------
        // GET SERVICE
        // ----------------------------------------------------

        const service =
            await bleServer.getPrimaryService(
                SERVICE_UUID
            );


        console.log(
            "BLE service found"
        );


        // ----------------------------------------------------
        // GET TX CHARACTERISTIC
        // ----------------------------------------------------

        txCharacteristic =
            await service.getCharacteristic(
                TX_UUID
            );


        console.log(
            "TX characteristic found"
        );


        // ----------------------------------------------------
        // ENABLE NOTIFICATIONS
        // ----------------------------------------------------

        await txCharacteristic.startNotifications();


        txCharacteristic.addEventListener(
            "characteristicvaluechanged",
            handleBLEData
        );


        // ----------------------------------------------------
        // CONNECTED
        // ----------------------------------------------------

        setConnected();


        console.log(
            "Notifications enabled"
        );


    } catch (error) {

        console.error(
            "Bluetooth error:",
            error
        );


        bluetoothDevice = null;

        bleServer = null;

        txCharacteristic = null;


        setDisconnected();


        let message =
            "Bluetooth connection failed.";


        if (
            error.name ===
            "NotFoundError"
        ) {

            message =
                "No ESP32 device selected.";

        }


        else if (
            error.name ===
            "SecurityError"
        ) {

            message =
                "Bluetooth permission denied.";

        }


        else if (
            error.name ===
            "NetworkError"
        ) {

            message =
                "Could not connect to ESP32.";

        }


        statusElement.innerText =
            message;

    }
}


// ============================================================
// BLE DATA RECEIVED
// ============================================================

function handleBLEData(event) {

    const value =
        event.target.value;


    const decoder =
        new TextDecoder(
            "utf-8"
        );


    const packet =
        decoder.decode(value).trim();


    console.log(
        "BLE DATA:",
        packet
    );


    rawDataElement.innerText =
        packet;


    // ========================================================
    // PACKET 1
    //
    // TDS:350,TURB:620
    // ========================================================

    if (
        packet.startsWith(
            "TDS:"
        )
    ) {

        processSensorPacket(
            packet
        );

    }


    // ========================================================
    // PACKET 2
    //
    // TEMP:27.50,Q:GOOD
    // ========================================================

    else if (
        packet.startsWith(
            "TEMP:"
        )
    ) {

        processTemperaturePacket(
            packet
        );

    }

}


// ============================================================
// PROCESS TDS + TURBIDITY
// ============================================================

function processSensorPacket(
    packet
) {

    const parts =
        packet.split(",");


    parts.forEach(
        function (part) {

            part =
                part.trim();


            // ------------------------------------------------
            // TDS
            // ------------------------------------------------

            if (
                part.startsWith(
                    "TDS:"
                )
            ) {

                const value =
                    part.substring(
                        4
                    );

                currentTDS =
                    value;

                tdsElement.innerText =
                    value;
            }


            // ------------------------------------------------
            // TURBIDITY
            // ------------------------------------------------

            if (
                part.startsWith(
                    "TURB:"
                )
            ) {

                const value =
                    part.substring(
                        5
                    );

                currentTurbidity =
                    value;

                turbidityElement.innerText =
                    value;
            }

        }
    );

}


// ============================================================
// PROCESS TEMPERATURE + QUALITY
// ============================================================

function processTemperaturePacket(
    packet
) {

    const parts =
        packet.split(",");


    parts.forEach(
        function (part) {

            part =
                part.trim();


            // ------------------------------------------------
            // TEMPERATURE
            // ------------------------------------------------

            if (
                part.startsWith(
                    "TEMP:"
                )
            ) {

                const value =
                    part.substring(
                        5
                    );

                currentTemperature =
                    value;

                if (
                    value ===
                    "NC"
                ) {

                    temperatureElement.innerText =
                        "NC";

                } else {

                    temperatureElement.innerText =
                        value;
                }
            }


            // ------------------------------------------------
            // QUALITY
            // ------------------------------------------------

            if (
                part.startsWith(
                    "Q:"
                )
            ) {

                const value =
                    part.substring(
                        2
                    );

                currentQuality =
                    value;

                updateQuality(
                    value
                );
            }

        }
    );

}


// ============================================================
// UPDATE QUALITY
// ============================================================

function updateQuality(
    value
) {

    const quality =
        value.toUpperCase();


    qualityElement.innerText =
        quality;


    // --------------------------------------------------------
    // REMOVE OLD CLASSES
    // --------------------------------------------------------

    qualityCard.classList.remove(
        "quality-pure",
        "quality-excellent",
        "quality-good",
        "quality-fair",
        "quality-high"
    );


    // --------------------------------------------------------
    // QUALITY
    // --------------------------------------------------------

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


    connectButton.disabled =
        false;


    buttonText.innerText =
        "CONNECTING...";

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

    try {

        if (
            bluetoothDevice &&
            bluetoothDevice.gatt.connected
        ) {

            bluetoothDevice.gatt.disconnect();

        }

    } catch (error) {

        console.error(
            error
        );
    }


    bluetoothDevice = null;

    bleServer = null;

    txCharacteristic = null;


    setDisconnected();

}


// ============================================================
// ESP32 DISCONNECTED
// ============================================================

function handleDisconnect() {

    console.log(
        "ESP32 disconnected"
    );


    bluetoothDevice = null;

    bleServer = null;

    txCharacteristic = null;


    setDisconnected();


    rawDataElement.innerText =
        "ESP32 disconnected";
}


// ============================================================
// START
// ============================================================

window.addEventListener(
    "load",
    function () {

        checkBluetoothSupport();

    }
);
