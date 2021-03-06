module.exports = {
    metadata: {
        plugin: "led",
        label: "LED",
        role: "actor",
        family: "dimmableLight",
        deviceTypes: ["microcontroller/microcontroller"],
        services: [{
            id: "on",
            label: "On"
        }, {
            id: "off",
            label: "Off"
        }, {
            id: "blink",
            label: "Blink"
        }, {
            id: "toggle",
            label: "Toggle"
        }, {
            id: "pulse",
            label: "Pulse",
            parameters: [{
                label: "Speed",
                id: "speed",
                type: {
                    id: "integer"
                },
                unit: "ms"
            }]
        }, {
            id: "brightness",
            label: "Brightness",
            parameters: [{
                label: "Brightness",
                id: "brightness",
                type: {
                    id: "integer"
                }
            }]
        }, {
            id: "fade",
            label: "Fade",
            parameters: [{
                label: "Brightness",
                id: "brightness",
                type: {
                    id: "integer"
                }
            }, {
                label: "Time",
                id: "time",
                type: {
                    id: "integer"
                }
            }]
        }],
        state: [{
            id: "light",
            label: "Light",
            type: {
                id: "string"
            }
        }, {
            id: "brightness",
            label: "Brightness",
            type: {
                id: "integer"
            }
        }],
        configuration: [{
            label: "Pin",
            id: "pin",
            type: {
                family: "reference",
                id: "digitalInOutPin"
            },
            defaultValue: "12"
        }, {
            label: "Controller",
            id: "controller",
            type: {
                family: "enumeration",
                values: [{
                    label: "DEFAULT",
                    id: "DEFAULT"
                }, {
                    label: "PCA9685",
                    id: "PCA9685"
                }]
            }
        }, {
            id: "inverted",
            label: "Inverted",
            type: {
                id: "boolean"
            }
        }]
    },
    create: function () {
        return new Led();
    }
};

var q = require('q');

/**
 *
 */
function Led() {
    /**
     *
     */
    Led.prototype.start = function () {
        var deferred = q.defer();

        this.operationalState = {
            status: 'PENDING',
            message: 'Waiting for initialization...'
        };
        this.publishOperationalStateChange();

        this.state = {
            light: "off",
            brightness : 0
        };

        if (!this.isSimulated()) {
            try {
                var five = require("johnny-five");

                this.led = new five.Led({
                    pin: this.configuration.pin,
                    controller: this.configuration.controller,
                    isAnode: this.configuration.inverted
                });

                this.setState(this.state);
                this.logDebug("LED initialized.");

                this.operationalState = {
                    status: 'OK',
                    message: 'LED successfully initialized'
                }
                this.publishOperationalStateChange();

                deferred.resolve();
            } catch (error) {
                this.operationalState = {
                    status: 'ERROR',
                    message: "Cannot initialize " +
                    this.device.id + "/" + this.id +
                    ":" + error
                }
                this.publishOperationalStateChange();  
                
                this.device.node
                    .publishMessage("Cannot initialize " +
                        this.device.id + "/" + this.id +
                        ":" + error);

                deferred.reject(error);
            }
        } else {
            this.operationalState = {
                status: 'OK',
                message: 'LED successfully initialized'
            }
            this.publishOperationalStateChange();

            deferred.resolve();
        }

        return deferred.promise;
    };

    /**
     *
     */
    Led.prototype.getState = function () {
        return this.state;
    };

    /**
     *
     */
    Led.prototype.setState = function (state) {
        this.state.light = state.light;

        if (this.led) {
            if (this.state.light === "blink") {
                this.led.blink();
                this.led.brightness(this.state.brightness);
            } else if (this.state.light === "on") {
                this.led.stop();
                this.led.on();
                this.led.brightness(this.state.brightness);

            } else {
                this.led.stop().off();
            }
        }
    };

    /**
     *
     */
    Led.prototype.on = function () {

        try {
            if (this.led) {
                this.led.stop();
                this.led.on();
            }

            this.state.light = "on";

            this.publishStateChange();
        }
        catch (err) {
            this.logDebug("########### Error in Microcontroller Actor. For safty reasons TIN is shutting down ###########");
            //process.exit();
        }
    };

    /**
     *
     */
    Led.prototype.off = function () {

        try {

            if (this.led) {
                this.led.stop().off();
            }

            this.state.light = "off";

            this.publishStateChange();
        }
        catch (err) {
            this.logDebug("########### Error in Microcontroller Actor. For safty reasons TIN is shutting down ###########");
            //process.exit();
        }
    };

    /**
     *
     */
    Led.prototype.toggle = function () {

        try {
            if (this.state.light == "off") {
                this.state.light = "on";

                if (this.led) {
                    this.led.stop();
                    this.led.on();
                }
            } else {
                this.state.light = "off";

                if (this.led) {
                    this.led.stop().off();
                }
            }

            this.publishStateChange();

        }
        catch (err) {
            this.logDebug("########### Error in Microcontroller Actor. For safty reasons TIN is shutting down ###########");
            //process.exit();
        }
    };

    /**
     *
     */
    Led.prototype.blink = function () {

        try {
            if (this.led) {
                this.led.blink();
            }

            this.state.light = "blink";

            this.publishStateChange();

        }
        catch (err) {
            this.logDebug("########### Error in Microcontroller Actor. For safty reasons TIN is shutting down ###########");
            //process.exit();
        }
    }
    /**
     *
     */
    Led.prototype.pulse = function (parameters) {

        try {
            if (this.led) {
                this.led.pulse(parameters.speed);
            }

            this.state.light = "pulse";

            this.publishStateChange();

        }
        catch (err) {
            this.logDebug("########### Error in Microcontroller Actor. For safty reasons TIN is shutting down ###########");
            //process.exit();
        }


    };
    /**
     *
     */
    Led.prototype.fade = function (parameters) {

        try {
            if (this.led) {
                this.led.fade(parameters.brightness, parameters.time, function () {

                    if (parameters.brightness === 0) {
                        this.state.light = "off";
                    } else {
                        this.state.light = "on"
                    }

                    this.publishStateChange();
                });
            }
        }
        catch (err) {
            this.logDebug("########### Error in Microcontroller Actor. For safty reasons TIN is shutting down ###########");
            //process.exit();
        }


    };
    /**
     *
     */
    Led.prototype.brightness = function (parameters) {

        try {
            if (this.led) {
                this.state.brightness = parameters.brightness;
                this.led.brightness(parameters.brightness);
            }

            this.state.light = "on";

            this.publishStateChange();

        }
        catch (err) {
            this.logDebug("########### Error in Microcontroller Actor. For safty reasons TIN is shutting down ###########");
            //process.exit();
        }


    }
}
;
