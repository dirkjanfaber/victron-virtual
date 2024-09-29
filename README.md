# Victron Virtual

Are you ready to supercharge your Victron Energy setup? Introducing the game-changing Node-RED node that brings virtual devices to life in your system!

The _Virtual Device_ node creates a virtual device on the underlying `dbus`, which allows for reading from and writing to the device as
if it is an actually connected device. The virtual device will also show up in VRM, allowing you to plot data from less-supported hardware.

Important note: Please be aware that using virtual devices on Victron systems may result in lower performance compared to using actual physical devices. Additionally, there is no official support provided when using virtual devices. These tools are intended for advanced users who understand and accept these limitations.

## Adding a device

To get started, pull a virtual device to the canvas and configure it. First the device type needs to be selected. At the moment the system supports:
- Grid meter
- Meteo
- Temperature sensor

Each device on the dbus needs to be uniquely identifed. This is done with a device identifcation, that must be unique for the type of device. Choosing a number between 100 and 200 should be a safe choise.

Once the device has been deployed and the flow restarted, the device should appear on the dbus. Then you can use a custom output
node to write values to the device. And of course use the regular nodes to read from the device.

Below you can find some device specific tips and tricks.

### Grid meter

For the grid meter, you wil need to select the number of phases that are available on the device.

### Meteo

The meteo device only supports the irradiance and windspeed. Typically you would use it to send data from your weather stations
to both a virtual meteo device and a virtual temperature sensor.

### Temperature sensor

Next to setting the temperature, the temperature sensor allows for setting humidity, pressure and battery voltage.

