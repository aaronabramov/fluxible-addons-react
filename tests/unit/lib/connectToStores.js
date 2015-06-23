/*globals describe,it,afterEach,beforeEach,document*/
'use strict';

var expect = require('chai').expect;
var mockery = require('mockery');
var React;
var ReactTestUtils;
var connectToStores;
var provideContext;
var FooStore = require('../../fixtures/stores/FooStore');
var BarStore = require('../../fixtures/stores/BarStore');
var createMockComponentContext = require('fluxible/utils/createMockComponentContext');
var jsdom = require('jsdom');

describe('connectToStores', function () {
    var appContext;

    beforeEach(function (done) {
        jsdom.env('<html><body></body></html>', [], function (err, window) {
            if (err) {
                done(err);
            }
            global.window = window;
            global.document = window.document;
            global.navigator = window.navigator;

            appContext = createMockComponentContext({
                stores: [FooStore, BarStore]
            });

            mockery.enable({
                warnOnReplace: false,
                warnOnUnregistered: false,
                useCleanCache: true
            });
            React = require('react/addons');
            ReactTestUtils = require('react/lib/ReactTestUtils');
            connectToStores = require('../../../').connectToStores;
            provideContext = require('../../../').provideContext;

            done();
        });
    });

    afterEach(function () {
        delete global.window;
        delete global.document;
        delete global.navigator;
        mockery.disable();
    });

    it('should get the state from the stores', function (done) {
        var Component = React.createClass({
            contextTypes: {
                executeAction: React.PropTypes.func.isRequired
            },
            onClick: function () {
                this.context.executeAction(function (actionContext) {
                    actionContext.dispatch('DOUBLE_UP');
                });
            },
            render: function () {
                return (
                    <div>
                        <span id="foo">{this.props.foo}</span>
                        <span id="bar">{this.props.bar}</span>
                        <button id="button" onClick={this.onClick} />
                    </div>
                );
            }
        });
        var WrappedComponent = provideContext(connectToStores(Component, [FooStore, BarStore], (context) => ({
            foo: context.getStore(FooStore).getFoo(),
            bar: context.getStore(BarStore).getBar()
        })));

        var container = document.createElement('div');
        var component = React.render(<WrappedComponent context={appContext} />, container);
        var domNode = component.getDOMNode();
        expect(domNode.querySelector('#foo').textContent).to.equal('bar');
        expect(domNode.querySelector('#bar').textContent).to.equal('baz');

        ReactTestUtils.Simulate.click(domNode.querySelector('#button'));

        expect(domNode.querySelector('#foo').textContent).to.equal('barbar');
        expect(domNode.querySelector('#bar').textContent).to.equal('bazbaz');

        expect(appContext.getStore(BarStore).listeners('change').length).to.equal(1);
        expect(appContext.getStore(FooStore).listeners('change').length).to.equal(1);

        React.unmountComponentAtNode(container);

        expect(appContext.getStore(BarStore).listeners('change').length).to.equal(0);
        expect(appContext.getStore(FooStore).listeners('change').length).to.equal(0);
        done();
    });

    it('should get the state from the stores using decorator pattern', function (done) {
        @connectToStores([FooStore, BarStore], (context) => {
            return {
                foo: context.getStore(FooStore).getFoo(),
                bar: context.getStore(BarStore).getBar()
            };
        })
        class Component extends React.Component {
            static contextTypes = {
                executeAction: React.PropTypes.func.isRequired
            }
            onClick() {
                this.context.executeAction(function (actionContext) {
                    actionContext.dispatch('DOUBLE_UP');
                });
            }
            render() {
                return (
                    <div>
                        <span id="foo">{this.props.foo}</span>
                        <span id="bar">{this.props.bar}</span>
                        <button id="button" onClick={this.onClick.bind(this)} />
                    </div>
                );
            }
        }

        var WrappedComponent = provideContext(Component);

        var container = document.createElement('div');
        var component = React.render(<WrappedComponent context={appContext} />, container);
        var domNode = component.getDOMNode();
        expect(domNode.querySelector('#foo').textContent).to.equal('bar');
        expect(domNode.querySelector('#bar').textContent).to.equal('baz');

        ReactTestUtils.Simulate.click(domNode.querySelector('#button'));

        expect(domNode.querySelector('#foo').textContent).to.equal('barbar');
        expect(domNode.querySelector('#bar').textContent).to.equal('bazbaz');

        expect(appContext.getStore(BarStore).listeners('change').length).to.equal(1);
        expect(appContext.getStore(FooStore).listeners('change').length).to.equal(1);

        React.unmountComponentAtNode(container);

        expect(appContext.getStore(BarStore).listeners('change').length).to.equal(0);
        expect(appContext.getStore(FooStore).listeners('change').length).to.equal(0);
        done();
    });

    it('should hoist non-react statics to higher order component', function () {
        var Component = React.createClass({
            displayName: 'Component',
            statics: {
                initAction: function () {}
            },
            render: function () {
                return (
                    <p>Hello world.</p>
                );
            }
        });
        var WrapperComponent = provideContext(connectToStores(Component, [FooStore, BarStore], {
            displayName: 'WrapperComponent',
            FooStore: function (store, props) {
                return {
                    foo: store.getFoo()
                };
            },
            BarStore: function (store, props) {
                return {
                    bar: store.getBar()
                };
            }
        }));

        expect(WrapperComponent.initAction).to.be.a('function');
        expect(WrapperComponent.displayName).to.not.equal(Component.displayName);
    });
});
