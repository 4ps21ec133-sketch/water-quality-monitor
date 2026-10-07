// =====================================================
// WATER QUALITY MONITOR
// ESP32 → BLE → APP INVENTOR → WEBVIEW → WEBSITE
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
// APP INVENTOR CHECK
// =====================================================

function isAppInventorWebView()
{
    return (
        window.AppInventor &&
        typeof window.AppInventor.getWebViewString === "function"
    );
}


// =====================================================
// READ DATA FROM APP INVENTOR
// =====================================================

function receiveFromAppInventor()
{
    // Website opened normally in Chrome
    if (!isAppInventorWebView())
    {
        return;
    }


    // Get WebViewString
    const data =
        window.AppInventor.getWebViewString();


    // No data
    if (!data || data.trim() === "")
    {
        return;
    }


    console.log(
        "DATA FROM APP INVENTOR:",
        data
    );


    // Show complete packet
    if (rawDataElement)
    {
        rawDataElement.innerText =
            data;
    }


    // Parse packet
    parseBLEData(data);


    // Update connection status
    setConnectedStatus();
}


// =====================================================
// PARSE ESP32 DATA
// =====================================================
//
// ESP32 sends:
//
// TDS:378,TURB:1250,TEMP:27.50,Q:GOOD
//
// =====================================================

function parseBLEData(data)
{

    // =================================================
    // TDS
    // =================================================

    const tdsMatch =
        data.match(
            /TDS:([0-9]+)/
        );


    if (tdsMatch)
    {

        const tds =
            tdsMatch[1];


        if (tdsElement)
        {
            tdsElement.innerText =
                tds;
        }


        console.log(
            "TDS:",
            tds
        );
    }


    // =================================================
    // TURBIDITY
    // =================================================

    const turbidityMatch =
        data.match(
            /TURB:([0-9]+)/
        );


    if (turbidityMatch)
    {

        const turbidity =
            turbidityMatch[1];


        if (turbidityElement)
        {
            turbidityElement.innerText =
                turbidity;
        }


        console.log(
            "Turbidity:",
            turbidity
        );
    }


    // =================================================
    // TEMPERATURE
    // =================================================

    const temperatureMatch =
        data.match(
            /TEMP:([-+]?[0-9]*\.?[0-9]+)/
        );


    if (temperatureMatch)
    {

        const temperature =
            parseFloat(
                temperatureMatch[1]
            );


        if (temperatureElement)
        {
            temperatureElement.innerText =
                temperature.toFixed(2) +
                " °C";
        }


        console.log(
            "Temperature:",
            temperature,
            "°C"
        );
    }


    // =================================================
    // WATER QUALITY
    // =================================================

    const qualityMatch =
        data.match(
            /Q:([A-Za-z]+)/
        );


    if (qualityMatch)
    {

        const quality =
            qualityMatch[1]
                .toUpperCase();


        if (qualityElement)
        {
            qualityElement.innerText =
                quality;
        }


        console.log(
            "Quality:",
            quality
        );


        updateQualityStyle(
            quality
        );
    }


    // =================================================
    // DEBUG
    // =================================================

    console.log(
        "All sensor data processed."
    );
}


// =====================================================
// UPDATE QUALITY STYLE
// =====================================================

function updateQualityStyle(quality)
{

    if (!qualityCard)
    {
        return;
    }


    // Remove previous quality classes

    qualityCard.classList.remove(
        "quality-pure",
        "quality-excellent",
        "quality-good",
        "quality-fair",
        "quality-high"
    );


    // =================================================
    // PURE
    // =================================================

    if (quality === "PURE")
    {

        qualityCard.classList.add(
            "quality-pure"
        );


        if (qualityIcon)
        {
            qualityIcon.innerText =
                "✓";
        }

    }


    // =================================================
    // EXCELLENT
    // =================================================

    else if (quality === "EXCELLENT")
    {

        qualityCard.classList.add(
            "quality-excellent"
        );


        if (qualityIcon)
        {
            qualityIcon.innerText =
                "✓";
        }

    }


    // =================================================
    // GOOD
    // =================================================

    else if (quality === "GOOD")
    {

        qualityCard.classList.add(
            "quality-good"
        );


        if (qualityIcon)
        {
            qualityIcon.innerText =
                "✓";
        }

    }


    // =================================================
    // FAIR
    // =================================================

    else if (quality === "FAIR")
    {

        qualityCard.classList.add(
            "quality-fair"
        );


        if (qualityIcon)
        {
            qualityIcon.innerText =
                "!";
        }

    }


    // =================================================
    // HIGH
    // =================================================

    else if (quality === "HIGH")
    {

        qualityCard.classList.add(
            "quality-high"
        );


        if (qualityIcon)
        {
            qualityIcon.innerText =
                "!";
        }

    }

}


// =====================================================
// CONNECTED STATUS
// =====================================================

function setConnectedStatus()
{

    if (statusElement)
    {
        statusElement.innerText =
            "Bluetooth Connected";
    }


    if (bluetoothIcon)
    {

        bluetoothIcon.classList.remove(
            "disconnected"
        );

        bluetoothIcon.classList.add(
            "connected"
        );
    }


    if (buttonText)
    {
        buttonText.innerText =
            "BLUETOOTH CONNECTED";
    }


    if (buttonIcon)
    {
        buttonIcon.innerText =
            "🟢";
    }

}


// =====================================================
// WAITING STATUS
// =====================================================

function setWaitingStatus()
{

    if (statusElement)
    {
        statusElement.innerText =
            "Waiting for Bluetooth...";
    }


    if (buttonText)
    {
        buttonText.innerText =
            "BLUETOOTH CONNECTED";
    }

}


// =====================================================
// CONNECT BUTTON
// =====================================================
//
// IMPORTANT:
//
// Bluetooth is handled by App Inventor.
// The website does NOT connect to ESP32.
//
// =====================================================

if (connectButton)
{

    connectButton.addEventListener(
        "click",
        function()
        {

            if (isAppInventorWebView())
            {

                alert(
                    "Bluetooth is controlled by the App Inventor application."
                );

            }

            else
            {

                alert(
                    "Please open this website inside the App Inventor WebViewer."
                );

            }

        }
    );

}


// =====================================================
// READ WEBVIEWSTRING EVERY 500 ms
// =====================================================

setInterval(
    receiveFromAppInventor,
    500
);


// =====================================================
// FIRST CHECK
// =====================================================

window.addEventListener(
    "load",
    function()
    {

        console.log(
            "Water Quality Monitor loaded"
        );


        if (isAppInventorWebView())
        {

            console.log(
                "Running inside App Inventor WebViewer"
            );


            setWaitingStatus();

        }

        else
        {

            console.log(
                "Running in normal browser"
            );


            if (statusElement)
            {
                statusElement.innerText =
                    "Open in App Inventor";
            }

        }


        // Try reading data immediately

        receiveFromAppInventor();

    }
);
