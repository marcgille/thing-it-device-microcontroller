module.exports = {
    metadata: {
        plugin: "servo",
        label: "Servo",
        role: "actor",
        family: "servo",
        deviceTypes: ["microcontroller/microcontroller"],
        services: [{
            id: "toPosition",
            label: "To Position",
            parameters: [{
                id: "position",
                label: "Position",
                type: {id: "integer"}
            }, {
                id: "time",
                label: "Time",
                type: {id: "integer"}
            }]
        }, {
            id: "minimum",
            label: "Minimum",
            parameters: []
        }, {
            id: "maximum",
            label: "Maximum",
            parameters: []
        }],
        state: [{
            id: "position",
            label: "Position",
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
            label: "Is Inverted",
            id: "isInverted",
            type: {
                id: "boolean"
            }
        }, {
            label: "Minimum",
            id: "minimum",
            type: {
                id: "integer"
            },
            defaultValue: 0
        }, {
            label: "Maximum",
            id: "maximum",
            type: {
                id: "integer"
            },
            defaultValue: 0
        }, {
            label: "Start At",
            id: "startAt",
            type: {
                id: "integer"
            },
            defaultValue: 0
        }, {
            label: "Center",
            id: "center",
            type: {
                id: "boolean"
            }
        }]
    },
    create: function () {
        return new Servo();
    }
};

var q = require('q');

/**
 *
 */
function Servo() {
    /**
     *
     */
    Servo.prototype.start = function () {
        var deferred = q.defer();

        this.operationalState = {
            status: 'PENDING',
            message: 'Waiting for initialization...'
        };
        this.publishOperationalStateChange();

        this.state = {
            position: this.configuration.startAt
        };

        var self = this;

        if (!self.isSimulated()) {
            var five = require("johnny-five");

            try {
                self.servo = new five.Servo({
                    pin: self.configuration.pin,
                    range: [self.configuration.minimum,
                        self.configuration.maximum],
                    startAt: self.configuration.startAt
                });

                this.operationalState = {
                    status: 'OK',
                    message: 'Servo successfully initialized'
                }
                this.publishOperationalStateChange();                
            } catch (error) {
                console.error("Cannot initialize Servo: " + error);

                this.operationalState = {
                    status: 'ERROR',
                    message: "Cannot initialize Servo: " + error
                }
                this.publishOperationalStateChange(); 

                deferred.reject("Cannot initialize real Servo: "
                    + error);
            }
        } else {
            this.operationalState = {
                status: 'OK',
                message: 'Servo successfully initialized'
            }
            this.publishOperationalStateChange();
        }


        self.publishStateChange();

        deferred.resolve();

        return deferred.promise;
    };

    /**
     *
     */
    Servo.prototype.getState = function () {
        return this.state;
    };

    /**
     *
     */
    Servo.prototype.setState = function (state) {
        this.state = state;

        if (this.servo) {
            this.servo.to(state.position);
        }
    };

    /**
     *
     */
    Servo.prototype.toPosition = function (parameters) {
        this.state.position = parameters.position;

        if (this.servo) {
            this.servo.to(parameters.position, parameters.time);
        }

        this.publishStateChange();
    };

    /**
     *
     */
    Servo.prototype.minimum = function () {
        this.state.position = this.configuration.minimum;

        if (this.servo) {
            this.servo.min();
        }

        this.publishStateChange();
    };

    /**
     *
     */
    Servo.prototype.maximum = function () {
        this.state.position = this.configuration.maximum;

        if (this.servo) {
            this.servo.max();
        }

        this.publishStateChange();
    };
}