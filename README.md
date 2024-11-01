# Victron Virtual

Are you ready to supercharge your Victron Energy setup? Introducing the game-changing Node-RED node that brings virtual devices to life in your system!

The _Virtual Device_ node creates a virtual device on the underlying `dbus`, which allows for reading from and writing to the device as
if it is an actually connected device. The virtual device will also show up in VRM, allowing you to plot data from less-supported hardware.

Important note: Please be aware that using virtual devices on Victron systems may result in lower performance compared to using actual physical devices. Additionally, there is no official support provided when using virtual devices. These tools are intended for advanced users who understand and accept these limitations.

## Adding a device

To get started, pull a virtual device to the canvas and configure it. First the
device type needs to be selected. At the moment the system supports:
- Grid meter
- Meteo
- Tank sensor
- Temperature sensor

Depending on the selected device type, you may get a few more fields that need
to be filled out. They are described below for each type of device.

Once the device has been deployed and the flow restarted, the device should
appear on the dbus. Then you can use a custom output node to write values to
the device. And of course use the regular nodes to read from the device.

Note that the _deviceInstance_, which uniquely defines a device on the dbus
will be generated automatically. The node status will show the obtained
deviceInstance in brackets. The label of the node will be set as _CustomName_
for the device, making it all easier to identify the virtual device.

Also note that it might take a short while before the service on the dbus is
actually created. So best practice is to wait a second before injecting data
into the virtual device.

With most virtual devices, you can pre-define some values via the edit panel to
make its use more convenient. For other devices, the edit panel allows you to
enable or disable some of the paths.

### Grid meter

For the grid meter, you wil need to select the number of phases that are
available on the device.

Do not use this feature to make an ESS system with third party energy meters.
There are multiple [officially supported
meters](https://www.victronenergy.com/meters-and-sensors/energy-meter) that can
be used in a Victron ESS system. Using other meters has proven too often to
lead to issues related with stability.

### Meteo

The meteo device only supports the irradiance and windspeed. Typically you
would use it to send data from your weather stations to both a virtual meteo
device and a virtual temperature sensor.

### Tank sensor

For the tank sensor you can pre-define some values, like the liquid type and
the capacity.  The capacity is a number. The volume unit is something that is
defined on the GX.

### Temperature sensor

Next to setting the temperature, the temperature sensor allows for setting
humidity, pressure and battery voltage.

