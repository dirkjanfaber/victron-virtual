const { addVictronInterfaces } = require('dbus-victron-virtual')
const dbus = require('dbus-native')

const commonproperties = {
  'Connected': {'i': 1 },
  'ProductName': {'s': 'Virtual device'},
  'Mgmt/Processname': { 's': 'Virtual NR device'},
  'Mgmt/ProcsessVersion': { 's': '0.1'},
  'Mgmt/Connection': {'s': 'Virtual'},
  'Status': {'i': 0},
  'CustomName': {'s': '-'},
  'DeviceInstance': {'i': 0}
}

const properties = {
  'digitalinput': {
    'Count': { 'i': 0 }
  },
  'grid': {
    'Ac/Energy/Forward': {'d': 0},
    'Ac/Energy/Reverse': {'d': 0},
    'Ac/Frequency': {'d': 0},
    'Ac/L1/Current': {'d': 0},
    'Ac/L1/Energy/Forward': {'d': 0},
    'Ac/L1/Energy/Reverse': {'d': 0},
    'Ac/L1/Power': {'d': 0},
    'Ac/L1/Voltage': {'d': 0},
    'Ac/L2/Current': {'d': 0},
    'Ac/L2/Energy/Forward': {'d': 0},
    'Ac/L2/Energy/Reverse': {'d': 0},
    'Ac/L2/Power': {'d': 0},
    'Ac/L2/Voltage': {'d': 0},
    'Ac/L3/Current': {'d': 0},
    'Ac/L3/Energy/Forward': {'d': 0},
    'Ac/L3/Energy/Reverse': {'d': 0},
    'Ac/L3/Power': {'d': 0},
    'Ac/L3/Voltage': {'d': 0},
    'Ac/Power': {'d': 0},
    'NrOfPhases': {'i': 0},
  },
  'heatpump': {
    'OperationMode': { 'i': 0},
    'Operation/Defrost': { 'i': 0},
    'Operation/Thermostat': { 'i': 0}
  },
  'pvinverter': {
    'Ac/Energy/Forward': {'d': 0},
    'Ac/L1/Current': {'d': 0},
    'Ac/L1/Energy/Forward': {'d': 0},
    'Ac/L1/Power': {'d': 0},
    'Ac/L1/Voltage': {'d': 0},
    'Ac/L2/Current': {'d': 0},
    'Ac/L2/Energy/Forward': {'d': 0},
    'Ac/L2/Power': {'d': 0},
    'Ac/L2/Voltage': {'d': 0},
    'Ac/L3/Current': {'d': 0},
    'Ac/L3/Energy/Forward': {'d': 0},
    'Ac/L3/Power': {'d': 0},
    'Ac/L3/Voltage': {'d': 0},
    'ErrorCode': {'d': 0},
    'FroniusDeviceType': {'d': 0},
    'Position': {'d': 0},
    'Serial': {'s': ''},
  },
  'meteo': {
    'Irradiance': {'d': 0},
    'Windspeed': {'d': 0},
    'ExternalTemperature': {'d': 0}
  },
  'temperature': {
    'ProductId': {'i': 0xc029 },
    'Temperature': {'d': 0},
    'TemperatureType': {'i': 2},
    'Pressure': {'d': 0},
    'Humidity': {'d': 0},
    'BatteryVoltage': {'d': 0},
  }
}

function getIfaceDesc(dev) {
  if (!properties[dev]) {
    return {};
  }

  const result = {};
  for (const key in properties[dev]) {
    result[key] = Object.keys(properties[dev][key])[0];
  }
  for (const key in commonproperties) {
    result[key] = Object.keys(commonproperties[key])[0];
  }

  return result;
}

function getIface(dev) {
  if (!properties[dev]) {
    return { emit: function() {} };
  }

  const result = { emit: function() {}};
  for (const key in properties[dev]) {
    if (properties[dev].hasOwnProperty(key)) {
      const innerObj = properties[dev][key]
      const innerKey = Object.keys(innerObj)[0]
      result[key] = innerObj[innerKey]
    }  
  }
  for (const key in commonproperties) {
    if (commonproperties.hasOwnProperty(key)) {
      const innerObj = commonproperties[key]
      const innerKey = Object.keys(innerObj)[0]
      result[key] = innerObj[innerKey]
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
          color: "red",
          shape: "dot",
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
          color: "red",
          shape: "dot",
          text: `Dbus errorcode ${retCode}`
        })
        return
      }
    })

    async function proceed(mybus, device) {

      // First, we need to create our interface description (here we will only expose method calls)
      var ifaceDesc = {
        name: interfaceName,
        methods: {
        },
        properties: getIfaceDesc(device),
        signals: {
        }
      };

      // Then we need to create the interface implementation (with actual functions)
      var iface = getIface(device);

      // Set the DeviceInstance correctly
      iface['DeviceInstance'] = Number(config.deviceinstance) || 0
      iface['CustomName'] = `Virtual ${config.device}` 

      // Now we need to actually export our interface on our object
      mybus.exportInterface(iface, objectPath, ifaceDesc);

      // Then we can add the required Victron interfaces, and receive some funtions to use
      const {
        emitItemsChanged,
        addSettings,
        removeSettings,
        addSystem,
        removeSystem,
        getValue,
        setValue
      } = addVictronInterfaces(mybus, ifaceDesc, iface);

      if (config.device === 'relay') {
        const settingsResult = await addSettings([
          { path: '/Settings/Relay/2/InitialState', default: 0, min: 0, max: 1 },
          { path: '/Settings/Relay/2/Function', default: 0, min: 0, max: 3 },
          { path: '/Settings/Relay/2/Polarity', default: 0, min: 0, max: 1 },
        ]);  
      }

      node.status({
        "fill": "green",
        "shape": "dot",
        "text": `Virtual ${config.device} (${config.deviceinstance})`
      })
        
    }

    node.on('input', function (msg) {
    })

    node.on('close', function (done) {
      node.warn("Remove service")
      done()
    })
  }

  RED.nodes.registerType('Virtual Device', VictronVirtualNode)
}
