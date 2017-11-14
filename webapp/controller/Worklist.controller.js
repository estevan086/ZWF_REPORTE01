/*global location */
/* global numeral:true */
var gd_FecIni;
var gd_FecIni;

sap.ui.define([
	"com/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"com/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"com/model/formatter",
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/util/Export",
	"sap/ui/core/util/ExportTypeCSV"
], function(BaseController, JSONModel, History, formatter, Filter, FilterOperator, MessageBox, MessageToast, Formatter, Controller, Export,
	ExportTypeCSV) {
	"use strict";

	return BaseController.extend("com.controller.Worklist", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit: function() {
			var oViewModel,
				iOriginalBusyDelay,
				oTable = this.byId("table");

			// Put down worklist table's original value for busy indicator delay,
			// so it can be restored later on. Busy handling on the table is
			// taken care of by the table itself.
			iOriginalBusyDelay = oTable.getBusyIndicatorDelay();
			// keeps the search state
			this._aTableSearchState = [];

			this._oTable = oTable;
			// keeps the filter and search state
			this._oListFilterState = {
				aFilter: [],
				aSearch: []
			};
			
			this._selectedSociedadItems = [];

			// Model used to manipulate control states
			oViewModel = new JSONModel({
				worklistTableTitle: this.getResourceBundle().getText("worklistTableTitle"),
				saveAsTileTitle: this.getResourceBundle().getText("saveAsTileTitle", this.getResourceBundle().getText("worklistViewTitle")),
				shareOnJamTitle: this.getResourceBundle().getText("worklistTitle"),
				shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
				shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
				tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
				tableBusyDelay: 0
			});
			this.setModel(oViewModel, "worklistView");

			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oTable.attachEventOnce("updateFinished", function() {
				// Restore original busy indicator delay for worklist's table
				oViewModel.setProperty("/tableBusyDelay", iOriginalBusyDelay);
			});
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Triggered by the table's 'updateFinished' event: after new table
		 * data is available, this handler method updates the table counter.
		 * This should only happen if the update was successful, which is
		 * why this handler is attached to 'updateFinished' and not to the
		 * table's list binding's 'dataReceived' method.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished: function(oEvent) {
			// update the worklist's object counter after the table update
			var sTitle,
				sTitle2,
				oTable = oEvent.getSource(),
				iTotalItems = oEvent.getParameter("total");
			// only update the counter if the length is final and
			// the table is not empty
			if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
				sTitle2 = this.getResourceBundle().getText("worklistTableCount", [iTotalItems]);
				this.getModel("worklistView").setProperty("/worklistTableCount", sTitle2);
			} else {
				sTitle = this.getResourceBundle().getText("worklistTableTitle");
			}
			this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
		},

		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 * @public
		 */
		onPress: function(oEvent) {
			// The source is the list item that got pressed
			this._showObject(oEvent.getSource());
		},

		/**
		 * Event handler when the share in JAM button has been clicked
		 * @public
		 */
		onShareInJamPress: function() {
			var oViewModel = this.getModel("worklistView"),
				oShareDialog = sap.ui.getCore().createComponent({
					name: "sap.collaboration.components.fiori.sharing.dialog",
					settings: {
						object: {
							id: location.href,
							share: oViewModel.getProperty("/shareOnJamTitle")
						}
					}
				});
			oShareDialog.open();
		},

		ongetData: function(oEvent) {

			debugger;
			
			this._oListFilterState.aSearch = [];

			var oTabBar = this.byId("iconTabBar");
			//	oTabBar.getBinding("items");

			//	oTabBar.getBindingContext().getProperty("Ticket");

			var Fecini = this.byId("datePickerfecini").mProperties.value;

			var Fecfin = this.byId("datePickerfecfin").mProperties.value;

			if (!Fecini || !Fecfin) {
				//_oListFilterState = [new Filter("FECHA_I", FilterOperator.Contains, Fecini)];
				MessageBox.warning('Debe ingresar el Rango de Fechas', null, "Mensaje del sistema", "OK", null);
				return;
			} else {
				this._oListFilterState.aSearch.push(new Filter("Credatetk", FilterOperator.BT, Fecini, Fecfin));
			}

			if ( this._selectedSociedadItems.length > 0 ) {
				for (var i = 0; i < this._selectedSociedadItems.length; i++) {
					
					//this._selectedSociedadItems.push( selectedItems[i].getKey() );
					this._oListFilterState.aSearch.push(new Filter("Bukrs", FilterOperator.EQ, this._selectedSociedadItems[i] ));
				}
				
			}

			var sQuery = oEvent.getParameter("query");

			if (sQuery && sQuery.length > 0) {
				this._oListFilterState.aSearch = [new Filter("Ticket", FilterOperator.Contains, sQuery)];
			}

			if (this._oListFilterState.aSearch.length > 0) {
				this._applySearchParam();
			}

		},

		onSearch: function(oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
			} else {
				var aTableSearchState = [];
				var sQuery = oEvent.getParameter("query");

				if (sQuery && sQuery.length > 0) {
					aTableSearchState = [new Filter("Ticket", FilterOperator.Contains, sQuery)];
				}
				this._applySearch(aTableSearchState);
			}

		},

		onSearchData: function(oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
			} else {
				var aTableSearchState = [];
				var sQuery = oEvent.getParameter("query");

				if (sQuery && sQuery.length > 0) {
					aTableSearchState = [new Filter("Ticket", FilterOperator.Contains, sQuery)];
				}
				this._applySearch();
			}

		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh: function() {
			var oTable = this.byId("table");
			oTable.getBinding("items").refresh();
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Shows the selected item on the object page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showObject: function(oItem) {
			this.getRouter().navTo("object", {
				objectId: oItem.getBindingContext().getProperty("Ticket"),
				objectIdSociedad: oItem.getBindingContext().getProperty("Bukrs")
			});
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
		 * @private
		 */
		_applySearch: function(aTableSearchState) {
			var oTable = this.byId("table"),
				oViewModel = this.getModel("worklistView");
			oTable.getBinding("items").filter(aTableSearchState, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aTableSearchState.length !== 0) {
				oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
			}
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
		 * @private
		 */
		_applySearchParam: function() {

			var aFilters = this._oListFilterState.aSearch.concat(this._oListFilterState.aFilter);

			var oTable = this.byId("table"),
				oViewModel = this.getModel("worklistView");

			this._oTable.getBinding("items").filter(aFilters, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (this._oListFilterState.aSearch.length !== 0) {
				oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
			}
		},

		onDataExport: sap.m.Table.prototype.exportData || function(oEvent) {

			var oExport = new Export({

				// Type that will be used to generate the content. Own ExportType's can be created to support other formats
				exportType: new ExportTypeCSV({
					// separatorChar: ";"
					separatorChar: "\t",
					mimeType: "application/vnd.ms-excel",
					charset: "utf-8",
					fileExtension: "xls"
				}),

				// Pass in the model created above
				models: this.getView().getModel(),

				// binding information for the rows aggregation
				rows: {
					path: "/Reporte01Set"
				},

				// column definitions with column name and binding info for the content

				columns: [{
					name: "Ticket",
					template: {
						content: "{Ticket}"
					}
				}, {
					name: "Sociedad",
					template: {
						content: "{Bukrs}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Codtorre}"
					}
				}]
			});

			// download exported file
			oExport.saveFile().catch(function(oError) {
				MessageBox.error("Error when downloading data. Browser might not be supported!\n\n" + oError);
			}).then(function() {
				oExport.destroy();
			});
		},

		handleDateChangefecini: function(oEvent) {
			//Prueba
			var sQuery = oEvent.getParameter("value");

			if (sQuery && sQuery.length > 0) {
				//	this._oListFilterState.aSearch.push(new Filter("Credate", FilterOperator.BT, sQuery));
			}
			//		this._applySearch(aTableSearchState);

		},

		handleDateChangefecfin: function(oEvent) {
			//Prueba
			var sQuery = oEvent.getParameter("value");

			if (sQuery && sQuery.length > 0) {
				//	this._oListFilterState.aSearch.push(new Filter("Credate", FilterOperator.EQ, sQuery));
			}
		},

		handleSelectionSociedadFinish: function(oEvent) {
			var selectedItems = oEvent.getParameter("selectedItems");
			var messageText = "Event 'selectionFinished': [";
			
			this._selectedSociedadItems = [];
			for (var i = 0; i < selectedItems.length; i++) {
				messageText += "'" + selectedItems[i].getText() + "'";
				this._selectedSociedadItems.push( selectedItems[i].getKey() );
				if (i !== selectedItems.length - 1) {
					messageText += ",";
				}
			}

			messageText += "]";

			/*MessageToast.show(messageText, {
				width: "auto"
			});*/
		},
		
		handleSelectionTorreFinish: function(oEvent) {
			var selectedItems = oEvent.getParameter("selectedItems");
			var messageText = "Event 'selectionFinished': [";
			
			this._selectedSociedadItems = [];
			for (var i = 0; i < selectedItems.length; i++) {
				messageText += "'" + selectedItems[i].getText() + "'";
				this._selectedSociedadItems.push( selectedItems[i].getKey() );
				if (i !== selectedItems.length - 1) {
					messageText += ",";
				}
			}

			messageText += "]";

			/*MessageToast.show(messageText, {
				width: "auto"
			});*/
		}

	});
});