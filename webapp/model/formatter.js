sap.ui.define([
	] , function () {
		"use strict";

		return {

			/**
			 * Rounds the number unit value to 2 digits
			 * @public
			 * @param {string} sValue the number string to be rounded
			 * @returns {string} sValue with 2 digits rounded
			 */
			numberUnit : function (sValue) {
				if (!sValue) {
					return "";
				}
				return parseFloat(sValue).toFixed(2);
			},
		
			status :  function (sStatus) {
				if (sStatus === "00") {
					return "Warning";
				} else if (sStatus === "10") {
					return "Success";
				} else if (sStatus === "15") {
					return "Error";
				} else {
					return "None";
				}
			}

		};

	}
);