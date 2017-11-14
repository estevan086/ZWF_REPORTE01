jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

sap.ui.require([
		"sap/ui/test/Opa5",
		"com/test/integration/pages/Common",
		"sap/ui/test/opaQunit",
		"com/test/integration/pages/Worklist",
		"com/test/integration/pages/Object",
		"com/test/integration/pages/NotFound",
		"com/test/integration/pages/Browser",
		"com/test/integration/pages/App"
	], function (Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "com.view."
	});

	sap.ui.require([
		"com/test/integration/WorklistJourney",
		"com/test/integration/ObjectJourney",
		"com/test/integration/NavigationJourney",
		"com/test/integration/NotFoundJourney",
		"com/test/integration/FLPIntegrationJourney"
	], function () {
		QUnit.start();
	});
});