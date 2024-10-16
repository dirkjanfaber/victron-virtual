const { addVictronInterfaces } = require('dbus-victron-virtual')
const dbus = require('dbus-native-victron')

const properties = {
  temperature: {
    Temperature: { type: 'd', format: (v) => v != null ? v.toFixed(1)+'C' : '' },
    TemperatureType: { type: 'i', value: 2, min: 0, max: 2,
      format: (v) => ({
        0: 'Battery',
        1: 'Fridge',
        2: 'Generic',
      }[v] || 'unknown')
     },
    Pressure: { type: 'd', format: (v) => v != null ? v.toFixed(0)+'hPa' : '' },
    Humidity: { type: 'd', format: (v) => v != null ?  v.toFixed(1)+'%' : '' },
    BatteryVoltage: { type: 'd', value: 3.3, format: (v) => v != null ?  v.toFixed(2)+'V' : ''  }
  },
  grid: {
    'Ac/Energy/Forward': { type: 'd', format: (v) => v.toFixed(2) + 'kWh', value: 0 },
    'Ac/Energy/Reverse': { type: 'd', format: (v) => v.toFixed(2) + 'kWh', value: 0 },
    'Ac/Frequency': { type: 'd', format: (v) => v.toFixed(2) + 'Hz' },
    'Ac/N/Current': { type: 'd', format: (v) => v.toFixed(2) + 'A' },
    'Ac/Power': { type: 'd', format: (v) => v.toFixed(2) + 'W' },
    'Ac/PENVoltage': { type: 'd', format: (v) => v.toFixed(2) + 'V' },
    'NrOfPhases': { type: 'd', format: (v) => v != null ? v : '', value: 1 },
    'ErrorCode': { type: 'd', format: (v) => v != null ? v : '', value: 0 },
    'Connected': { type: 'd', format: (v) => v != null ? v : '', value: 1 },
    'Position': { type: 'd', format: (v) => v != null ? v : '', value: 0 }
  },
  heatpump: {
    DHWSetpoint: { type: 'd', format: (v) => v != null ? v.toFixed(1)+'C' : '' },
    INVSecondaryCurrent: { type: 'd' },
    'Operation/BUHStep1': { type: 's' },
    'Operation/CirculationPump': { type: 's' },
    'Operation/Defrost': { type: 's' },
    'Operation/PowerfullDHW': { type: 's' },
    'Operation/Reheat': { type: 's' },
    'Operation/SmartGridContact1': { type: 's' },
    'Operation/SmartGridContact2': { type: 's' },
    'Operation/Thermostat': { type: 's' },
    'Operation/WaterFlowSwitch': { type: 's' },
    'Operation/WaterPump': { type: 's' },
    OperationMode: { type: 's' },
    'Temperature/DHWTank': { type: 'd', format: (v) => v != null ? v.toFixed(1)+'C' : '' },
    'Temperature/IndoorAmbient': { type: 'd', format: (v) => v != null ? v.toFixed(1)+'C' : '' },
    'Temperature/InletWater': { type: 'd', format: (v) => v != null ? v.toFixed(1)+'C' : '' },
    'Temperature/LeavingWaterTempAfterBUH': { type: 'd', format: (v) => v != null ? v.toFixed(1)+'C' : '' },
    'Temperature/LeavingWaterTempBeforeBUH': { type: 'd', format: (v) => v != null ? v.toFixed(1)+'C' : '' },
    'Temperature/OutdoorHeatExchanger': { type: 'd', format: (v) => v != null ? v.toFixed(1)+'C' : '' }
  },
  meteo: {
    Irradiance: { type: 'd', format: (v) => v != null ? v.toFixed(1)+'W/m2' : '' },
    Windspeeed: { type: 'd', format: (v) => v != null ? v.toFixed(1)+'m/s' : '' }
  },
  tank: {
      'Alarms/High/Active': { type: 'd' },
      'Alarms/High/Delay': { type: 'd' },
      'Alarms/High/Enable': { type: 'd' },
      'Alarms/High/Restore': { type: 'd' },
      'Alarms/High/State': { type: 'd' },
      'Alarms/Low/Active': { type: 'd' },
      'Alarms/Low/Delay': { type: 'd' },
      'Alarms/Low/Enable': { type: 'd' },
      'Alarms/Low/Restore': { type: 'd' },
      'Alarms/Low/State': { type: 'd' },
      Capacity: { type: 'd' },
      FilterLength: { type: 'd' },
      FluidType: {
        type: 'i',
        format: (v) => ({
          0: 'Fuel',
          1: 'Fresh water',
          2: 'Waste water',
          3: 'Live well',
          4: 'Oil',
          5: 'Black water (sewage)',
          6: 'Gasoline',
          7: 'Diesel',
          8: 'LPG',
          9: 'LNG',
          10: 'Hydraulic oil',
          11: 'Raw water'
        }[v] || 'unknown'),
        value: 0
      },
      Level: { type: 'd' },
      RawUnit: { type: 's' },
      RawValue: { type: 'd' },
      RawValueEmpty: { type: 'd' },
      RawValueFull: { type: 'd' },
      Remaining: { type: 'd' },
      Shape: { type: 's' }
  }
}

function getIfaceDesc(dev) {
  if (!properties[dev]) {
    return {};
  }

  const result = {};

  // Deep copy the properties, including format functions
  for (const [key, value] of Object.entries(properties[dev])) {
    result[key] = { ...value };
    if (typeof value.format === 'function') {
      result[key].format = value.format;
    }
  }

  result.DeviceInstance = { type: 'd' };
  result.CustomName = { type: 's' };
  result.Status = { type: 'i' };

  return result;
}

function getIface(dev) {
  if (!properties[dev]) {
    return { emit: function () {} };
  }

  const result = { emit: function () {} };

  for (const key in properties[dev]) {

    const propertyValue = JSON.parse(JSON.stringify(properties[dev][key]));

    if (propertyValue.value !== undefined) {
      result[key] = propertyValue.value;
    } else {
      switch (propertyValue.type) {
        case 's':
          result[key] = '-';
          break;
        default:
          result[key] = null;
      }
    }
  }

  return result;
}

module.exports = function (RED) {
  function VictronVirtualNode (config) {
    RED.nodes.createNode(this, config)
    const node = this
    const address = process.env.NODE_RED_DBUS_ADDRESS
      ? process.env.NODE_RED_DBUS_ADDRESS.split(':')
      : null
    if (address && address.length === 2) {
      this.address = `tcp:host=${address[0]},port=${address[1]}`
    }

    // Connnect to the dbus
    if (this.address) {
      node.warn(`Connecting to TCP address ${this.address}.`)
      this.bus = dbus.createClient({
        busAddress: this.address,
        authMethods: ['ANONYMOUS']
      })
    } else {
      this.bus = process.env.DBUS_SESSION_BUS_ADDRESS
        ? dbus.sessionBus()
        : dbus.systemBus()
    }
    if (!this.bus) {
      throw new Error('Could not connect to the DBus session bus.')
    }

    let serviceName = `com.victronenergy.${config.device}.virtual_${this.id}`
    // For relays, we only add services, setting the serviceName to this (will result in 0x3 code)
    if (config.device === 'relay') {
      serviceName = 'com.victronenergy.settings'
    }

    const interfaceName = serviceName
    const objectPath = `/${serviceName.replace(/\./g, '/')}`

    this.bus.requestName(serviceName, 0x4, (err, retCode) => {
      // If there was an error, warn user and fail
      if (err) {
        node.warn(
      `Could not request service name ${serviceName}, the error was: ${err}.`
        )
        node.status({
          color: 'red',
          shape: 'dot',
          text: `${err}`
        })
        return
      }

      // Return code 0x1 means we successfully had the name
      // Return code 0x3 means it already exists (which should be fine)
      if (retCode === 1 || retCode === 3) {
        console.log(`Successfully requested service name "${serviceName}" (${retCode})`)
        proceed(this.bus, config.device)
      } else {
        /* Other return codes means various errors, check here
	(https://dbus.freedesktop.org/doc/api/html/group__DBusShared.html#ga37a9bc7c6eb11d212bf8d5e5ff3b50f9) for more
	information
	*/
        node.warn(
      `Failed to request service name "${serviceName} for ${config.device}". Check what return code "${retCode}" means.`
        )
        node.status({
          color: 'red',
          shape: 'dot',
          text: `Dbus errorcode ${retCode}`
        })
      }
    })

    async function proceed (mybus, device) {
      // First, we need to create our interface description (here we will only expose method calls)
      const ifaceDesc = {
        name: interfaceName,
        methods: {
        },
        properties: getIfaceDesc(device),
        signals: {
        }
      }

      // Then we need to create the interface implementation (with actual functions)
      const iface = getIface(device)

      // Set the DeviceInstance correctly
      iface.DeviceInstance = Number(config.deviceinstance) || 0
      iface.CustomName = config.name || `Virtual ${config.device}`
      iface.Status = 0

      // Device specific configuration
      switch (config.device ) {
        case 'grid': {
          iface.NrOfPhases = Number(config.grid_nrofphases) || 1
          const properties = [
            { name: 'Current', unit: 'A' },
            { name: 'Power', unit: 'W' },
            { name: 'Voltage', unit: 'V' },
            { name: 'Energy/Forward', unit: 'kWh' },
            { name: 'Energy/Reverse', unit: 'kWh' }
          ];
          for (let i = 1; i <= iface.NrOfPhases; i++) {
            const phase = `L${i}`;
              properties.forEach(({ name, unit }) => {
              const key = `Ac/${phase}/${name}`;
              ifaceDesc.properties[key] = {
                type: 'd',
                format: (v) => v.toFixed(2) + unit
              };
              iface[key] = 0;
            });
          }
        }
        break;
      }

      // Now we need to actually export our interface on our object
      mybus.exportInterface(iface, objectPath, ifaceDesc)

      // Then we can add the required Victron interfaces, and receive some funtions to use
      const {
        emitItemsChanged,
        addSettings,
        removeSettings,
        addSystem,
        removeSystem,
        getValue,
        setValue
      } = addVictronInterfaces(mybus, ifaceDesc, iface)

      // if (config.device === 'relay') {
      //   const settingsResult = await addSettings([
      //     { path: '/Settings/Relay/2/InitialState', default: 0, min: 0, max: 1 },
      //     { path: '/Settings/Relay/2/Function', default: 0, min: 0, max: 3 },
      //     { path: '/Settings/Relay/2/Polarity', default: 0, min: 0, max: 1 }
      //   ])
      // }

      node.status({
        fill: 'green',
        shape: 'dot',
        text: `Virtual ${config.device} (${config.deviceinstance})`
      })
    }

    node.on('input', function (msg) {
    })

    node.on('close', function (done) {
      this.bus.connection.end()
      done()
    })
  }

  RED.nodes.registerType('Virtual Device', VictronVirtualNode)
}
