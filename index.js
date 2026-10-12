// =====================================================
// WATER QUALITY MONITOR
// WEBSITE — NORMAL GOOGLE CHROME
// =====================================================


// =====================================================
// HTML ELEMENTS
// =====================================================

const connectButton =
    document.getElementById("connectButton");

const buttonText =
    document.getElementById("buttonText");

const buttonIcon =
    document.getElementById("buttonIcon");

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

const qualityCard =
    document.getElementById("qualityCard");

const qualityIcon =
    document.getElementById("qualityIcon");

const bluetoothIcon =
    document.getElementById("bluetoothIcon");


// =====================================================
// PARSE SENSOR DATA
// Example:
// TDS:378,TURB:1250,TEMP:27.50,Q:GOOD
// =====================================================

function parseBLEData(data) {

    if (!data) return;

    if (rawDataElement) {
        rawDataElement.innerText = data;
    }

    // TDS
    const tdsMatch = data.match(/TDS:([0-9]+)/);

    if (tdsMatch && tdsElement) {
        tdsElement.innerText = tdsMatch[1];
    }

    // TURBIDITY
    const turbidityMatch = data.match(/TURB:([0-9]+)/);

    if (turbidityMatch && turbidityElement) {
        turbidityElement.innerText = turbidityMatch[1];
    }

    // TEMPERATURE
    const temperatureMatch =
        data.match(/TEMP:([-+]?[0-9]*\.?[0-9]+)/);

    if (temperatureMatch && temperatureElement) {
        temperatureElement.innerText =
            parseFloat(temperatureMatch[1]).toFixed(2) + " °C";
    }

    // WATER QUALITY
    const qualityMatch = data.match(/Q:([A-Za-z]+)/);

    if (qualityMatch) {
        const quality = qualityMatch[1].toUpperCase();

        if (qualityElement) {
            qualityElement.innerText = quality;
        }

        updateQualityStyle(quality);
    }
}


// =====================================================
// UPDATE WATER QUALITY STYLE
// =====================================================

function updateQualityStyle(quality) {

    if (!qualityCard) return;

    qualityCard.classList.remove(
        "quality-pure",
        "quality-excellent",
        "quality-good",
        "quality-fair",
        "quality-high"
    );

    const classes = {
        PURE: "quality-pure",
        EXCELLENT: "quality-excellent",
        GOOD: "quality-good",
        FAIR: "quality-fair",
        HIGH: "quality-high"
    };

    if (classes[quality]) {
        qualityCard.classList.add(classes[quality]);
    }

    if (qualityIcon) {
        qualityIcon.innerText =
            ["PURE", "EXCELLENT", "GOOD"].includes(quality)
                ? "✓"
                : "!";
    }
}


// =====================================================
// CONNECTION STATUS
// =====================================================

function setConnectedStatus() {

    if (statusElement) {
        statusElement.innerText = "Bluetooth Connected";
    }

    if (bluetoothIcon) {
        bluetoothIcon.classList.remove("disconnected");
        bluetoothIcon.classList.add("connected");
    }

    if (buttonText) {
        buttonText.innerText = "BLUETOOTH CONNECTED";
    }

    if (buttonIcon) {
        buttonIcon.innerText = "🟢";
    }
}


// =====================================================
// INITIAL STATUS
// =====================================================

window.addEventListener("load", function () {

    console.log("Water Quality Monitor loaded in Chrome");

    if (statusElement) {
        statusElement.innerText =
            "Ready — connect Bluetooth to receive data";
    }

    if (buttonText) {
        buttonText.innerText = "CONNECT BLUETOOTH";
    }

    if (buttonIcon) {
        buttonIcon.innerText = "🔵";
    }

    // Sample data for testing the website display.
    // Uncomment the next line to test the sensor cards.
    // parseBLEData("TDS:378,TURB:1250,TEMP:27.50,Q:GOOD");

});


// =====================================================
// TEST FUNCTION
// Call this from the browser console to test the UI.
// =====================================================

window.testSensorData = function () {

    parseBLEData(
        "TDS:378,TURB:1250,TEMP:27.50,Q:GOOD"
    );

};
