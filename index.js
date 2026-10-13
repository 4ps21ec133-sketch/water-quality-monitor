const SERVICE_UUID =
"6E400001-B5A3-F393-E0A9-E50E24DCCA9E";

const TX_UUID =
"6E400003-B5A3-F393-E0A9-E50E24DCCA9E";
const device = await navigator.bluetooth.requestDevice({
    filters: [
        { name: "Water Quality Monitor" }
    ],
    optionalServices: [SERVICE_UUID]
});
const server = await device.gatt.connect();

const service =
    await server.getPrimaryService(SERVICE_UUID);

const characteristic =
    await service.getCharacteristic(TX_UUID);

await characteristic.startNotifications();
characteristic.addEventListener(
    "characteristicvaluechanged",
    event => {

        const data =
            new TextDecoder().decode(
                event.target.value
            );

        console.log(data);
    }
);
