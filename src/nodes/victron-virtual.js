const { addVictronInterfaces } = require('dbus-victron-virtual')
const dbus = require('dbus-native')

const properties = {
  temperature: {
    DeviceInstance: { type: 'd' },
    ProductId: { type: 'i', value: 0xc029 },
    Temperature: { type: 'd', format: (v) => v.toFixed(2) + 'C' },
    TemperatureType: { type: 'i', value: 2 },
    Pressure: { type: 'd' },
    Humidity: { type: 'd' },
    BatteryVoltage: { type: 'd' }
  },
  gridmeter: {

  },
  heatpump: {
    DHWSetpoint: { type: 'd', format: (v) => v.toFixed(2) + 'C' },
    DeviceInstance: { type: 'd' },
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
    'Temperature/DHWTank': { type: 'd', format: (v) => v.toFixed(2) + 'C' },
    'Temperature/IndoorAmbient': { type: 'd', format: (v) => v.toFixed(2) + 'C' },
    'Temperature/InletWater': { type: 'd', format: (v) => v.toFixed(2) + 'C' },
    'Temperature/LeavingWaterTempAfterBUH': { type: 'd', format: (v) => v.toFixed(2) + 'C' },
    'Temperature/LeavingWaterTempBeforeBUH': { type: 'd', format: (v) => v.toFixed(2) + 'C' },
    'Temperature/OutdoorHeatExchanger': { type: 'd', format: (v) => v.toFixed(2) + 'C' }
  },
  meteo: {
    DeviceInstance: { type: 'd' },
    ExternalTemperature: { type: 'd', format: (v) => v.toFixed(2) + 'C' },
    Irradiance: { type: 'd' },
    Windspeeed: { type: 'd' }
  }
}

function getIfaceDesc (dev) {
  if (!properties[dev]) {
    return {}
  }
  const result = properties[dev]
  properties[dev].DeviceInstance = 'd'
  properties[dev].CustomName = 's'
  properties[dev].Status = 'i'

  return result
}

function getIface (dev) {
  if (!properties[dev]) {
    return { emit: function () {} }
  }

  const result = { emit: function () {} }
  for (let key in properties[dev]) {
    if (properties[dev][key].value) {
      result[key] = properties[dev][key].value
      delete (properties[dev][key].value)  
    } else {
      switch (properties[dev][key].type) {
        case 's': result[key] = '-'; break;
        default: result[key] = 0
      }
    }
  }

  // const result = { emit: function () {} }
  // for (const key in properties[dev]) {
    
  //   if (typeof properties[dev][key] === 'object' && properties[dev][key] !== null) {
  //     result[key] = properties[dev][key].value
  //     delete (properties[dev][key].value)
  //   }
  // }
  return result
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

    node.warn('Starting up virtual device...')

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
        console.log(`Successfully requested service name "${serviceName}"!`)
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

      if (config.device === 'relay') {
        const settingsResult = await addSettings([
          { path: '/Settings/Relay/2/InitialState', default: 0, min: 0, max: 1 },
          { path: '/Settings/Relay/2/Function', default: 0, min: 0, max: 3 },
          { path: '/Settings/Relay/2/Polarity', default: 0, min: 0, max: 1 }
        ])
      }

      node.status({
        fill: 'green',
        shape: 'dot',
        text: `Virtual ${config.device} (${config.deviceinstance})`
      })
    }

    node.on('input', function (msg) {
    })

    node.on('close', function (done) {
      node.warn('Remove service')
      done()
    })
  }

  RED.nodes.registerType('Virtual Device', VictronVirtualNode)
}
