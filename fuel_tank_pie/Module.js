Ext.define('Store.fuel_tank_pie.Module', {
    extend: 'Ext.Component',
    extensionName: 'fuel_tank_pie',

    initModule: function () {
        var mainFrame = this.getMainFrame();

        if (!window.skeleton || !skeleton.navigation || !mainFrame) {
            Ext.log('fuel_tank_pie: PILOT layout containers not found');
            return;
        }

        this.defineClasses();
        this.loadStyles();

        var store = Ext.create('Ext.data.Store', {
            fields: [
                'agentid',
                'veh_id',
                'imei',
                'name',
                'folder',
                'fuel',
                'capacity',
                'capacitySource',
                'unit',
                'percent',
                'sensorSummary',
                'sensors',
                'rawVehicle',
                'updatedAt'
            ]
        });

        var mainPanel = Ext.create('Store.fuel_tank_pie.view.MainPanel', {
            vehicleStore: store
        });

        var navTab = Ext.create(this.getLeftBarClass(), {
            title: l('Fuel'),
            iconCls: 'fa fa-tint',
            iconAlign: 'top',
            minimized: true,
            layout: 'fit',
            items: [
                Ext.create('Store.fuel_tank_pie.view.VehicleList', {
                    vehicleStore: store,
                    mainPanel: mainPanel,
                    module: this
                })
            ]
        });

        navTab.map_frame = mainPanel;
        skeleton.navigation.add(navTab);
        mainFrame.add(mainPanel);

        this.loadVehicles(store, mainPanel);
    },

    defineClasses: function () {
        var module = this;

        if (!Ext.ClassManager.get('Store.fuel_tank_pie.view.VehicleList')) {
            Ext.define('Store.fuel_tank_pie.view.VehicleList', {
                extend: 'Ext.panel.Panel',
                title: l('Fuel sensors'),
                iconCls: 'fa fa-tint',
                layout: 'fit',

                initComponent: function () {
                    var panel = this;

                    this.grid = Ext.create('Ext.grid.Panel', {
                        border: false,
                        store: panel.vehicleStore,
                        emptyText: l('No vehicles with fuel sensors'),
                        columns: [
                            {
                                text: l('Vehicle'),
                                dataIndex: 'name',
                                flex: 1,
                                renderer: module.encode
                            },
                            {
                                text: l('Fuel'),
                                dataIndex: 'fuel',
                                width: 92,
                                align: 'right',
                                renderer: function (value, meta, record) {
                                    return module.formatFuel(value, record.get('unit'));
                                }
                            }
                        ],
                        tbar: [
                            {
                                xtype: 'textfield',
                                emptyText: l('Search'),
                                flex: 1,
                                enableKeyEvents: true,
                                listeners: {
                                    change: function (field, value) {
                                        panel.applyFilter(value);
                                    }
                                }
                            },
                            {
                                xtype: 'button',
                                iconCls: 'fa fa-sync',
                                tooltip: l('Refresh'),
                                handler: function () {
                                    panel.module.loadVehicles(panel.vehicleStore, panel.mainPanel);
                                }
                            }
                        ],
                        listeners: {
                            selectionchange: function (selectionModel, records) {
                                if (records.length) {
                                    panel.mainPanel.showVehicle(records[0], panel.module);
                                }
                            }
                        }
                    });

                    this.items = [this.grid];
                    this.callParent(arguments);
                },

                applyFilter: function (query) {
                    var value = String(query || '').toLowerCase();

                    this.vehicleStore.clearFilter();
                    if (!value) {
                        return;
                    }

                    this.vehicleStore.filterBy(function (record) {
                        return String(record.get('name') || '').toLowerCase().indexOf(value) !== -1 ||
                            String(record.get('sensorSummary') || '').toLowerCase().indexOf(value) !== -1;
                    });
                }
            });
        }

        if (!Ext.ClassManager.get('Store.fuel_tank_pie.view.MainPanel')) {
            Ext.define('Store.fuel_tank_pie.view.MainPanel', {
                extend: 'Ext.panel.Panel',
                title: l('Fuel tank'),
                cls: 'fuel-tank-pie-panel',
                layout: 'border',

                initComponent: function () {
                    var panel = this;

                    this.infoPanel = Ext.create('Ext.panel.Panel', {
                        region: 'north',
                        height: 132,
                        bodyPadding: 16,
                        cls: 'fuel-tank-pie-info',
                        html: panel.emptyInfoHtml()
                    });

                    this.capacityField = Ext.create('Ext.form.field.Number', {
                        fieldLabel: l('Full tank'),
                        labelWidth: 82,
                        minValue: 1,
                        allowDecimals: true,
                        decimalPrecision: 2,
                        width: 230,
                        emptyText: l('liters'),
                        listeners: {
                            change: function (field, value) {
                                panel.onCapacityChange(value);
                            }
                        }
                    });

                    this.chartPanel = Ext.create('Ext.panel.Panel', {
                        region: 'center',
                        layout: 'fit',
                        bodyPadding: 16,
                        cls: 'fuel-tank-pie-chart',
                        tbar: [
                            this.capacityField,
                            {
                                xtype: 'tbtext',
                                itemId: 'capacityHint',
                                text: ''
                            }
                        ],
                        html: '<div class="fuel-tank-pie-empty">' + module.encode(l('Select a vehicle')) + '</div>',
                        listeners: {
                            resize: function () {
                                panel.renderChart();
                            }
                        }
                    });

                    this.sensorStore = Ext.create('Ext.data.Store', {
                        fields: ['info', 'fuel', 'fieldname', 'id']
                    });

                    this.sensorGrid = Ext.create('Ext.grid.Panel', {
                        region: 'east',
                        width: 360,
                        split: true,
                        title: l('Fuel sensors'),
                        store: this.sensorStore,
                        emptyText: l('No sensor data'),
                        columns: [
                            {
                                text: l('Sensor'),
                                dataIndex: 'info',
                                flex: 1,
                                renderer: module.encode
                            },
                            {
                                text: l('Value'),
                                dataIndex: 'fuel',
                                width: 110,
                                align: 'right',
                                renderer: function (value) {
                                    return module.formatFuel(value, panel.currentUnit || 'l');
                                }
                            }
                        ]
                    });

                    this.items = [this.infoPanel, this.chartPanel, this.sensorGrid];
                    this.callParent(arguments);
                },

                emptyInfoHtml: function () {
                    return '<div class="fuel-tank-pie-title">' + module.encode(l('Fuel tank balance')) + '</div>' +
                        '<div class="fuel-tank-pie-muted">' +
                        module.encode(l('Select a vehicle with a fuel sensor from the list.')) +
                        '</div>';
                },

                showVehicle: function (record, ownerModule) {
                    this.currentRecord = record;
                    this.currentModule = ownerModule;
                    this.currentUnit = record.get('unit') || 'l';

                    this.capacityField.suspendEvents(false);
                    this.capacityField.setValue(record.get('capacity') || null);
                    this.capacityField.resumeEvents();

                    this.updateInfo(record);
                    this.sensorStore.loadData(record.get('sensors') || []);
                    this.renderChart();
                    ownerModule.loadInstantStatus(record, this);
                },

                updateInfo: function (record, message) {
                    var fuel = record.get('fuel');
                    var capacity = record.get('capacity');
                    var percent = module.percent(fuel, capacity);
                    var source = record.get('capacitySource');
                    var sourceText = source === 'saved' ? l('saved') :
                        source === 'vehicle' ? l('vehicle data') :
                            source === 'percent' ? l('percent sensor') :
                                source === 'estimated' ? l('estimated') : l('not set');

                    this.infoPanel.update(
                        '<div class="fuel-tank-pie-title">' + module.encode(record.get('name')) + '</div>' +
                        '<div class="fuel-tank-pie-stats">' +
                        '<div><span>' + module.encode(l('Current fuel')) + '</span><b>' +
                        module.encode(module.formatFuel(fuel, record.get('unit'))) + '</b></div>' +
                        '<div><span>' + module.encode(l('Full tank')) + '</span><b>' +
                        module.encode(capacity ? module.formatFuel(capacity, record.get('unit')) : l('not set')) + '</b></div>' +
                        '<div><span>' + module.encode(l('Filled')) + '</span><b>' +
                        module.encode(percent === null ? '-' : module.formatNumber(percent, 1) + ' %') + '</b></div>' +
                        '</div>' +
                        '<div class="fuel-tank-pie-muted">' +
                        module.encode(record.get('sensorSummary') || '') +
                        '</div>' +
                        '<div class="fuel-tank-pie-muted">' +
                        module.encode(l('Tank capacity source') + ': ' + sourceText + (message ? '. ' + message : '')) +
                        '</div>'
                    );

                    var hint = this.chartPanel.down('#capacityHint');
                    if (hint) {
                        hint.setText(source === 'estimated' ? l('Capacity is estimated; adjust if needed') : '');
                    }
                },

                onCapacityChange: function (value) {
                    if (!this.currentRecord) {
                        return;
                    }

                    var capacity = module.toNumber(value);
                    if (!capacity || capacity <= 0) {
                        return;
                    }

                    this.currentRecord.set('capacity', capacity);
                    this.currentRecord.set('capacitySource', 'saved');
                    module.saveCapacity(this.currentRecord.get('agentid'), capacity);
                    this.updateInfo(this.currentRecord);
                    this.renderChart();
                },

                applyInstantStatus: function (record, payload) {
                    var data = payload && payload.data ? payload.data : null;
                    var sensors = module.instantSensors(data, record.get('unit'));
                    var fuel = module.toNumber(data && data.fuel);

                    if (sensors.length) {
                        record.set('sensors', sensors);
                        record.set('sensorSummary', module.sensorSummary(sensors));
                        this.sensorStore.loadData(sensors);
                    }

                    if (fuel !== null) {
                        record.set('fuel', fuel);
                    }

                    record.set('updatedAt', data && data.unixtimestamp ? data.unixtimestamp : null);
                    this.updateInfo(record);
                    this.renderChart();
                },

                showLoadError: function (record, message) {
                    this.updateInfo(record, message || l('Current fuel refresh failed'));
                },

                renderChart: function () {
                    var record = this.currentRecord;
                    var body = this.chartPanel && this.chartPanel.body;

                    if (!record || !body) {
                        return;
                    }

                    var fuel = module.toNumber(record.get('fuel'));
                    var capacity = module.toNumber(record.get('capacity'));

                    if (fuel === null || !capacity || capacity <= 0) {
                        body.update('<div class="fuel-tank-pie-empty">' +
                            module.encode(l('Set full tank capacity to build the chart.')) +
                            '</div>');
                        return;
                    }

                    if (fuel > capacity) {
                        capacity = fuel;
                    }

                    var free = Math.max(capacity - fuel, 0);
                    var percent = module.percent(fuel, capacity) || 0;
                    var containerId = this.id + '-chart';

                    body.update('<div id="' + containerId + '" class="fuel-tank-pie-chart-target"></div>');

                    if (window.Highcharts) {
                        Highcharts.chart(containerId, {
                            chart: {
                                type: 'pie',
                                backgroundColor: 'transparent'
                            },
                            credits: {
                                enabled: false
                            },
                            title: {
                                text: module.formatNumber(percent, 1) + '%'
                            },
                            subtitle: {
                                text: module.encode(record.get('name'))
                            },
                            tooltip: {
                                pointFormat: '<b>{point.y:.2f}</b> ' + module.encode(record.get('unit') || 'l')
                            },
                            plotOptions: {
                                pie: {
                                    innerSize: '62%',
                                    dataLabels: {
                                        enabled: true,
                                        format: '{point.name}: {point.percentage:.1f}%'
                                    }
                                }
                            },
                            series: [{
                                name: l('Fuel'),
                                data: [
                                    {
                                        name: l('Fuel left'),
                                        y: fuel,
                                        color: '#2f9e44'
                                    },
                                    {
                                        name: l('Free volume'),
                                        y: free,
                                        color: '#d8dee9'
                                    }
                                ]
                            }]
                        });
                        return;
                    }

                    this.renderCssChart(body, fuel, free, percent, record.get('unit'));
                },

                renderCssChart: function (body, fuel, free, percent, unit) {
                    body.update(
                        '<div class="fuel-tank-pie-css-wrap">' +
                        '<div class="fuel-tank-pie-css-chart" style="--fuel-percent:' + Math.max(0, Math.min(100, percent)) + ';">' +
                        '<div><b>' + module.encode(module.formatNumber(percent, 1)) + '%</b><span>' +
                        module.encode(module.formatFuel(fuel, unit)) + '</span></div>' +
                        '</div>' +
                        '<div class="fuel-tank-pie-legend">' +
                        '<span><i class="fuel"></i>' + module.encode(l('Fuel left')) + ': ' + module.encode(module.formatFuel(fuel, unit)) + '</span>' +
                        '<span><i class="free"></i>' + module.encode(l('Free volume')) + ': ' + module.encode(module.formatFuel(free, unit)) + '</span>' +
                        '</div>' +
                        '</div>'
                    );
                }
            });
        }
    },

    loadVehicles: function (store, mainPanel) {
        var me = this;

        store.removeAll();
        if (mainPanel) {
            mainPanel.infoPanel.update('<div class="fuel-tank-pie-empty">' + me.encode(l('Loading vehicles...')) + '</div>');
        }

        Ext.Ajax.request({
            url: '/api/v3/vehicles',
            method: 'GET',
            success: function (response) {
                var payload = me.decodeResponse(response);
                var vehicles = payload && Ext.isArray(payload.data) ? payload.data : [];
                var rows = me.prepareVehicles(vehicles);

                store.loadData(rows);

                if (mainPanel) {
                    if (rows.length) {
                        mainPanel.infoPanel.update(mainPanel.emptyInfoHtml());
                    } else {
                        mainPanel.infoPanel.update('<div class="fuel-tank-pie-empty">' +
                            me.encode(l('No vehicles with fuel sensors were found.')) +
                            '</div>');
                    }
                }
            },
            failure: function (response) {
                var text = response && response.status ? 'HTTP ' + response.status : l('Request failed');

                if (mainPanel) {
                    mainPanel.infoPanel.update('<div class="fuel-tank-pie-empty">' +
                        me.encode(l('Unable to load vehicles') + ': ' + text) +
                        '</div>');
                }
            }
        });
    },

    loadInstantStatus: function (record, mainPanel) {
        var me = this;
        var agentId = record && record.get('agentid');

        if (!agentId) {
            return;
        }

        Ext.Ajax.request({
            url: '/api/v3/vehicles/instant-status',
            method: 'GET',
            params: {
                agent_id: agentId,
                ts: Math.floor(Date.now() / 1000)
            },
            success: function (response) {
                var payload = me.decodeResponse(response);

                if (payload && String(payload.code) === '0') {
                    mainPanel.applyInstantStatus(record, payload);
                } else {
                    mainPanel.showLoadError(record, l('API returned an error'));
                }
            },
            failure: function (response) {
                mainPanel.showLoadError(record, response && response.status ? 'HTTP ' + response.status : null);
            }
        });
    },

    prepareVehicles: function (vehicles) {
        var me = this;
        var rows = [];

        Ext.Array.forEach(vehicles || [], function (vehicle) {
            var sensors = me.extractFuelSensors(vehicle);

            if (!sensors.length) {
                return;
            }

            var unit = me.detectUnit(sensors);
            var fuel = me.sumFuel(sensors, unit);
            var capacityInfo = me.resolveCapacity(vehicle, fuel, unit);
            var agentId = vehicle.agentid || vehicle.agent_id || vehicle.veh_id;

            rows.push({
                agentid: agentId,
                veh_id: vehicle.veh_id,
                imei: vehicle.imei,
                name: me.cleanName(vehicle.vehiclenumber || vehicle.name || vehicle.imei || agentId),
                folder: vehicle.folder || '',
                fuel: fuel,
                capacity: capacityInfo.value,
                capacitySource: capacityInfo.source,
                unit: unit,
                percent: me.percent(fuel, capacityInfo.value),
                sensorSummary: me.sensorSummary(sensors),
                sensors: sensors,
                rawVehicle: vehicle,
                updatedAt: vehicle.status && vehicle.status.unixtimestamp ? vehicle.status.unixtimestamp : null
            });
        });

        rows.sort(function (a, b) {
            return String(a.name || '').localeCompare(String(b.name || ''));
        });

        return rows;
    },

    extractFuelSensors: function (vehicle) {
        var me = this;
        var source = [];

        if (Ext.isArray(vehicle.sensors_status)) {
            source = source.concat(vehicle.sensors_status);
        }
        if (vehicle.status && Ext.isArray(vehicle.status.fuel_sensors)) {
            source = source.concat(vehicle.status.fuel_sensors);
        }
        if (Ext.isArray(vehicle.fuel_sensors)) {
            source = source.concat(vehicle.fuel_sensors);
        }

        var result = [];

        Ext.Array.forEach(source, function (sensor) {
            var normalized = me.normalizeSensor(sensor);

            if (normalized && me.isFuelSensor(normalized)) {
                result.push(normalized);
            }
        });

        return result;
    },

    instantSensors: function (data, unit) {
        var me = this;
        var sensors = [];

        Ext.Array.forEach(data && data.fuel_sensors ? data.fuel_sensors : [], function (sensor) {
            var normalized = me.normalizeSensor(sensor);

            if (normalized) {
                normalized.unit = unit || 'l';
                sensors.push(normalized);
            }
        });

        return sensors;
    },

    normalizeSensor: function (sensor) {
        if (!sensor) {
            return null;
        }

        var name = sensor.name || sensor.info || sensor.description || sensor.fieldname || '';
        var value = this.toNumber(sensor.fuel);

        if (value === null) {
            value = this.toNumber(sensor.dig_value);
        }

        if (value === null) {
            value = this.numberFromText(sensor.hum_value);
        }

        return {
            id: sensor.id,
            info: String(name || l('Fuel sensor')),
            fuel: value,
            hum_value: sensor.hum_value || '',
            raw_value: sensor.raw_value,
            fieldname: sensor.fieldname || '',
            group: sensor.group || '',
            unit: this.sensorUnit(sensor)
        };
    },

    isFuelSensor: function (sensor) {
        var text = [
            sensor.info,
            sensor.hum_value,
            sensor.fieldname,
            sensor.group
        ].join(' ').toLowerCase();

        var include = /(fuel|топл|дут|бак)/i.test(text);
        var exclude = /(тип топлива|fuel type|расход|consumption|battery|batt|gsm|акб|батар)/i.test(text);

        return include && !exclude && this.toNumber(sensor.fuel) !== null;
    },

    sensorUnit: function (sensor) {
        var text = String(sensor.hum_value || sensor.info || '').toLowerCase();

        if (text.indexOf('%') !== -1) {
            return '%';
        }

        return 'l';
    },

    detectUnit: function (sensors) {
        var percentCount = 0;

        Ext.Array.forEach(sensors || [], function (sensor) {
            if (sensor.unit === '%') {
                percentCount += 1;
            }
        });

        return percentCount === sensors.length ? '%' : 'l';
    },

    sumFuel: function (sensors, unit) {
        var total = 0;
        var count = 0;

        Ext.Array.forEach(sensors || [], function (sensor) {
            if (unit === '%' && sensor.unit !== '%') {
                return;
            }
            if (unit !== '%' && sensor.unit === '%') {
                return;
            }
            if (Ext.isNumber(sensor.fuel)) {
                total += sensor.fuel;
                count += 1;
            }
        });

        return count ? total : null;
    },

    resolveCapacity: function (vehicle, fuel, unit) {
        var agentId = vehicle.agentid || vehicle.agent_id || vehicle.veh_id;
        var saved = this.loadCapacity(agentId);

        if (saved) {
            return {
                value: saved,
                source: 'saved'
            };
        }

        if (unit === '%') {
            return {
                value: 100,
                source: 'percent'
            };
        }

        var configured = this.findConfiguredCapacity(vehicle);

        if (configured) {
            return {
                value: configured,
                source: 'vehicle'
            };
        }

        if (fuel && fuel > 0) {
            return {
                value: this.estimateCapacity(fuel),
                source: 'estimated'
            };
        }

        return {
            value: null,
            source: 'not_set'
        };
    },

    findConfiguredCapacity: function (vehicle) {
        var found = null;
        var me = this;

        function scan(value, key) {
            if (found || value === null || value === undefined) {
                return;
            }

            if (Ext.isObject(value)) {
                Ext.Object.each(value, function (childKey, childValue) {
                    scan(childValue, childKey);
                });
                return;
            }

            if (!key || !me.isCapacityKey(key)) {
                return;
            }

            var number = me.toNumber(value);
            if (number && number > 0) {
                found = number;
            }
        }

        scan(vehicle, '');
        return found;
    },

    isCapacityKey: function (key) {
        var value = String(key || '').toLowerCase();

        return /^(tank_capacity|fuel_capacity|fuel_tank|fuel_tank_capacity|tank_volume|max_fuel|fuel_volume|full_tank)$/i.test(value) ||
            (/tank/.test(value) && /(capacity|volume|fuel)/.test(value)) ||
            (/бак/.test(value) && /(емк|ёмк|объ|топл)/.test(value));
    },

    estimateCapacity: function (fuel) {
        var step = fuel > 300 ? 100 : 50;
        return Math.max(step, Math.ceil(fuel / step) * step);
    },

    saveCapacity: function (agentId, capacity) {
        try {
            window.localStorage.setItem('fuel_tank_pie.capacity.' + agentId, String(capacity));
        } catch (e) {
            Ext.log('fuel_tank_pie: unable to save capacity');
        }
    },

    loadCapacity: function (agentId) {
        try {
            return this.toNumber(window.localStorage.getItem('fuel_tank_pie.capacity.' + agentId));
        } catch (e) {
            return null;
        }
    },

    sensorSummary: function (sensors) {
        var names = [];

        Ext.Array.forEach(sensors || [], function (sensor) {
            names.push(sensor.info + ': ' + sensor.fuel + ' ' + (sensor.unit || 'l'));
        });

        return names.join(', ');
    },

    percent: function (fuel, capacity) {
        var current = this.toNumber(fuel);
        var full = this.toNumber(capacity);

        if (current === null || !full || full <= 0) {
            return null;
        }

        return Math.max(0, Math.min(100, current / full * 100));
    },

    formatFuel: function (value, unit) {
        var number = this.toNumber(value);

        if (number === null) {
            return '-';
        }

        return this.formatNumber(number, 2) + ' ' + (unit || 'l');
    },

    formatNumber: function (value, decimals) {
        var number = this.toNumber(value);

        if (number === null) {
            return '-';
        }

        if (typeof num === 'function') {
            return num(number, decimals);
        }

        return Number(number).toFixed(decimals).replace(/\.?0+$/, '');
    },

    numberFromText: function (value) {
        var text = String(value || '').replace(',', '.');
        var match = text.match(/-?\d+(\.\d+)?/);

        return match ? this.toNumber(match[0]) : null;
    },

    toNumber: function (value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        var number = Number(String(value).replace(',', '.'));

        return isFinite(number) ? number : null;
    },

    cleanName: function (value) {
        return String(value || l('Vehicle')).replace(/\s+/g, ' ').trim();
    },

    encode: function (value) {
        return Ext.String.htmlEncode(String(value === null || value === undefined ? '' : value));
    },

    decodeResponse: function (response) {
        try {
            return Ext.decode(response.responseText);
        } catch (e) {
            return null;
        }
    },

    getMainFrame: function () {
        return window.skeleton && (skeleton.mapframe || skeleton.map_frame);
    },

    getLeftBarClass: function () {
        return Ext.ClassManager.get('Pilot.utils.LeftBarPanel') ? 'Pilot.utils.LeftBarPanel' : 'Ext.panel.Panel';
    },

    loadStyles: function () {
        var href = '/store/' + this.extensionName + '/style.css';
        var exists = false;

        Ext.Array.forEach(document.getElementsByTagName('link'), function (link) {
            if (link.getAttribute('href') === href) {
                exists = true;
            }
        });

        if (exists) {
            return;
        }

        var css = document.createElement('link');
        css.setAttribute('rel', 'stylesheet');
        css.setAttribute('type', 'text/css');
        css.setAttribute('href', href);
        document.head.appendChild(css);
    }
});
