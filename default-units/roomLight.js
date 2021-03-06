module.exports = {
    metadata: {
        plugin: "roomLight",
        label: "Room Light",
        role: "actor",
        family: "roomLight",
        deviceTypes: ["microcontroller/microcontroller"],
        services: [
            {id: "toggleLight", label: "Toggle Light"},
            {
                id: "dimmerChange",
                label: "Dimmer Change",
                parameters: [
                    {
                        label: 'Dimmer Level',
                        id: 'dimmerLevel',
                        type: {
                            id: 'decimal'
                        }
                    }
                ]
            },
        ],
        state: [
            {
                id: "switch", label: "Switch",
                type: {
                    id: "boolean"
                }
            }, {
                id: "brightness", label: "Brightness",
                type: {
                    id: "decimal"
                }
            }],
        configuration: [{
            label: "Encoder sensitivity",
            id: "encoderSensitivity",
            typ: {
                id: "decimal"
            },
            defaultValue: 5,
        }]
    },
    create: function () {
        return new RoomLight();
    }
};

var q = require('q');

/**
 *
 */
function RoomLight() {
    /**
     *
     */
    RoomLight.prototype.start = function () {
        var deferred = q.defer();

        this.operationalState = {
            status: 'PENDING',
            message: 'Waiting for initialization...'
        };
        this.publishOperationalStateChange();

        this.logLevel = "debug";

        this.state = {
            switch: false,
            brightness: 50
        };

        if (!this.isSimulated()) {
            try {
                var five = require("johnny-five");

                this.light1 = new five.Led({
                    pin: 12,//TODO DEMOCASE
                    controller: "PCA9685",
                    isAnode: true
                });

                this.light2 = new five.Led({
                    pin: 13,//TODO DEMOCASE
                    controller: "PCA9685",
                    isAnode: true
                });

                this.light3 = new five.Led({
                    pin: 14,//TODO DEMOCASE
                    controller: "PCA9685",
                    isAnode: true
                });

                this.upButton = new five.Button({
                    pin: 2, //TODO DEMOCASE
                    isPullup: true,
                });

                this.downButton = new five.Button({
                    pin: 17,//TODO DEMOCASE
                    type: "digital",
                    isPullup: true,
                });

                this.pressButton = new five.Button({
                    pin: 16,//TODO DEMOCASE
                    type: "digital",
                    isPullup: true,
                });

                var waveform = '';
                var waveformTimeout;

                this.upButton.on('up', function () {
                    waveform += '1';
                    handleWaveform();
                });

                this.downButton.on('up', function () {
                    waveform += '0';
                    handleWaveform();
                });

                this.pressButton.on('down', function () {
                    this.state.switch = !this.state.switch;
                    this.setState(this.state);

                }.bind(this));

                var self = this;

                function handleWaveform() {
                    if (waveform.length < 2) {
                        waveformTimeout = setTimeout(function () {
                            waveform = '';
                        }, 8);
                        return;
                    }

                    if (waveformTimeout) {
                        clearTimeout(waveformTimeout);
                    }

                    if (waveform === '10') {
                        self.state.brightness = (self.state.brightness + self.configuration.encoderSensitivity);

                        if (self.state.brightness > 100) {
                            self.state.brightness = 100
                        }
                        self.setState(self.state);

                    } else if (waveform === '01') {
                        self.state.brightness = (self.state.brightness - self.configuration.encoderSensitivity);

                        if (self.state.brightness < 0) {
                            self.state.brightness = 0;
                        }

                        self.setState(self.state);
                    }

                    waveform = '';
                }

                this.setState(this.state);
                this.logDebug("Room Light initialized.");

                this.operationalState = {
                    status: 'OK',
                    message: 'Room Light successfully initialized'
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
                message: 'Room Light successfully initialized'
            }
            this.publishOperationalStateChange();

            deferred.resolve();
        }

        return deferred.promise;
    };

    /**
     *
     */
    RoomLight.prototype.getState = function () {
        return this.state;
    };

    /**
     *
     */
    RoomLight.prototype.setState = function (targetstate) {
        var promise;
        var deferred = q.defer();

        this.logDebug("SetState: ", targetstate);

        if (this.isSimulated()) {
            this.state = targetstate;
            this.publishStateChange();

        } else {

            this.state = targetstate;
            let byteBrightness = (targetstate.brightness * 2.55).toFixed();

            if (byteBrightness > 255) {
                byteBrightness = 255;
            }

            if (this.state.switch) {
                this.light1.brightness(byteBrightness);
                this.light2.brightness(byteBrightness);
                this.light3.brightness(byteBrightness);
            } else {
                //this.light1.brightness(byteBrightness);
                this.light1.stop().off();
                //this.light2.brightness(byteBrightness);
                this.light2.stop().off();
                //this.light3.brightness(byteBrightness);
                this.light3.stop().off();
            }

            console.log(this.state);
            this.publishStateChange();

            deferred.resolve();
            promise = deferred.promise;
            return promise;

        }
    };

    /**
     *
     */
    RoomLight.prototype.toggleLight = function () {

        try {
            if (this.state.switch === false) {
                this.state.switch = true;
                this.light1.on();
                this.light2.on();
                this.light3.on();

            } else {
                this.state.switch = false;
                this.light1.stop().off();
                this.light2.stop().off();
                this.light3.stop().off();
            }

            this.publishStateChange();
        }
        catch (err) {
            this.logDebug("########### Error in Microcontroller Actor. For safty reasons TIN is shutting down ###########");
            //process.exit();
        }
    };

        /**
     * Brightness update service
     * @input {{dimmerLevel:number}} param - dimmer level
     */
    RoomLight.prototype.dimmerChange = function (param) {
        let promise;
        let deferred = q.defer();

        let paramDimmerLevel = param.hasOwnProperty('dimmerLevel') ? param.dimmerLevel : null        


        if (paramDimmerLevel !== null && this.state.brightness !== paramDimmerLevel) {
      
            if (this.isSimulated()) {
                this.state.brightness = paramDimmerLevel;
                this.publishStateChange();    
            } else {
                this.state.brightness = paramDimmerLevel;
                let byteBrightness = (paramDimmerLevel * 2.55).toFixed();
    
                if (byteBrightness > 255) {
                    byteBrightness = 255;
                }
    
                if (this.state.switch) {
                    this.light1.brightness(byteBrightness);
                    this.light2.brightness(byteBrightness);
                    this.light3.brightness(byteBrightness);
                } else {
                    //this.light1.brightness(byteBrightness);
                    this.light1.stop().off();
                    //this.light2.brightness(byteBrightness);
                    this.light2.stop().off();
                    //this.light3.brightness(byteBrightness);
                    this.light3.stop().off();
                }
    
                console.log(this.state);
                this.publishStateChange();
            }
        }
        deferred.resolve();
        promise = deferred.promise;
        return promise;
    }
};
