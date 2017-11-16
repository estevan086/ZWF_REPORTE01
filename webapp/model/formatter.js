sap.ui.define([], function() {
	"use strict";

	return {

		/**
		 * Rounds the number unit value to 2 digits
		 * @public
		 * @param {string} sValue the number string to be rounded
		 * @returns {string} sValue with 2 digits rounded
		 */
		numberUnit: function(sValue) {
			if (!sValue) {
				return "";
			}
			return parseFloat(sValue).toFixed(2);
		},

		status: function(sStatus) {
			if (sStatus === "00") {
				return "Warning";
			} else if (sStatus === "10") {
				return "Success";
			} else if (sStatus === "15") {
				return "Error";
			} else {
				return "None";
			}
		},

		formatDate: function(v) {
			jQuery.sap.require("sap.ui.core.format.DateFormat");
			var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
				pattern: "dd-MM-YYYY"
			});
			return oDateFormat.format(new Date(v));
		},

		formatTime: function(v) {

			if (v) {
				var timeFormat = sap.ui.core.format.DateFormat.getTimeInstance({
					pattern: "KK:mm:ss a"
				});

				var TZOffsetMs = new Date(0).getTimezoneOffset() * 60 * 1000;

				var timeStr = timeFormat.format(new Date(v.ms + TZOffsetMs));

				return timeStr;
			}
		}

	};

});