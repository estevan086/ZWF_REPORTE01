/*global location */
/* global numeral:true */
var gd_FecIni;
var gd_FecIni;

var g_servicio_reporte = "/sap/opu/odata/sap/ZSGW_REPORTES_SRV/";

// var testJson = [{
// 	"name": "Tony Peña",
// 	"city": "New York",
// 	"country": "United States",
// 	"birthdate": "1978-03-15",
// 	"amount": 42

// }, {
// 	"name": "Ζαλώνης Thessaloniki",
// 	"city": "Athens",
// 	"country": "Greece",
// 	"birthdate": "1987-11-23",
// 	"amount": 42
// }];

// // Simple type mapping; dates can be hard
// // and I would prefer to simply use `datevalue`
// // ... you could even add the formula in here.
// var testTypes = {
// 	"name": "String",
// 	"city": "String",
// 	"country": "String",
// 	"birthdate": "String",
// 	"amount": "Number"
// };

sap.ui.define([
	"com/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"com/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/util/Export",
	"sap/ui/core/util/ExportTypeCSV",
	'sap/ui/model/Sorter',
	'jquery.sap.global',
	'sap/ui/core/Fragment',
	"sap/ui/core/BusyIndicator"
], function(BaseController, JSONModel, History, formatter, Filter, FilterOperator, MessageBox, MessageToast, Controller,
	Export,
	ExportTypeCSV,
	Sorter,
	jQuery,
	Fragment,
	BusyIndicator) {
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

			jQuery.sap.require("com.model.formatter");

			var oViewModel,
				oTableModel,
				iOriginalBusyDelay,
				oTable = this.byId("table");

			this.oEventgetData = "";
			this.oSF = this.byId("searchFieldUsuCre");

			// Put down worklist table's original value for busy indicator delay,
			// so it can be restored later on. Busy handling on the table is
			// taken care of by the table itself.
			iOriginalBusyDelay = oTable.getBusyIndicatorDelay();
			// keeps the search state
			this._aTableSearchState = [];

			var oModelTable = {
				"items": [

				]
			};

			this.oModelData = {
				"items": [

				]
			};

			oTableModel = new JSONModel();
			oTableModel.setData(oModelTable);

			oTable.setModel(oTableModel);

			this._oTable = oTable;
			// keeps the filter and search state
			this._oListFilterState = {
				aFilter: [],
				aSearch: []
			};

			this._selectedSociedadItems = [];
			this._selectedTorreItems = [];
			this._selectedProcesoItems = [];
			this._selectedTorreSubprItems = [];
			this._selectedSubprocesoItems = [];
			this._selectedStatusItems = [];

			var cbStateItems = [{
				Code: "00",
				Name: "Abierto"
			}, {
				Code: "10",
				Name: "Cerrado"
			}, {
				Code: "15",
				Name: "Anulado"
			}];
			var cbStateModel = new JSONModel({
				items: cbStateItems
			});
			this.getView().setModel(cbStateModel, "cbState");

			// Model used to manipulate control states
			oViewModel = new JSONModel({
				worklistTableTitle: this.getResourceBundle().getText("worklistTableTitle"),
				saveAsTileTitle: this.getResourceBundle().getText("saveAsTileTitle", this.getResourceBundle().getText("worklistViewTitle")),
				shareOnJamTitle: this.getResourceBundle().getText("worklistTitle"),
				shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
				shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
				tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
				tableBusyDelay: 0,
				Cerrados: 0,
				Abiertos: 0,
				Anulados: 0,
				worklistTableCount: 0
			});
			this.setModel(oViewModel, "worklistView");

			// Create an object of filters
			this._mFilters = {
				"idCerrados": [new sap.ui.model.Filter("Statustk", "EQ", "10")],
				"idAbiertos": [new sap.ui.model.Filter("Statustk", "EQ", "00")],
				"idAnulados": [new sap.ui.model.Filter("Statustk", "EQ", "15")],
				"all": []
			};

			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oTable.attachEventOnce("updateFinished", function() {
				// Restore original busy indicator delay for worklist's table
				oViewModel.setProperty("/tableBusyDelay", iOriginalBusyDelay);
			});

			this.oData = {
				//items es una propiedad del objeto oData
				items: []
			};
			//creamos el modelo JSON y le asignamos el objeto OData
			var oModel = new JSONModel(this.oData);
			//asignamos el modelo JSON oModel a la vista a la que esta relacionada el controlar en este caso App.view
			this.getView().byId("table").setModel(oModel);
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
				// sTitle2 = this.getResourceBundle().getText("worklistTableCount", [iTotalItems]);
				// this.getModel("worklistView").setProperty("/worklistTableCount", sTitle2);
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
		onPressRow: function(oEvent) {
			// The source is the list item that got pressed
			this._showObject(oEvent.getSource());
		},

		onSelectionChange: function(event) {
			alert(event.getSource().getSelectedItem().getBindingContext().getObject().Name);
			console.log(JSON.stringify(event.getSource().getSelectedItem().getBindingContext().getObject()));
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
			// var dialog = new sap.m.BusyDialog({
			// 							text:'Loading Data...'
			// 						 });
			// dialog.open();

			// BusyIndicator.show();
			//...

			// var busyDialog = this.getView().byId("BusyDialog");
			// busyDialog.setBusyIndicatorDelay(0);
			// busyDialog.setVisible(true);
			// busyDialog.open();
			//this.oEventgetData = oEvent;
			this.fnOpenBusyDialog();
			sap.ui.getCore().byId("idBusyDialog").setText("Cargando datos...");

			var that = this;
			jQuery.sap.delayedCall(500, this, function() {
				this.ongetOData();
			});

			// busyDialog.close();
			// busyDialog.setVisible(false);

			// dialog.close();
			// BusyIndicator.hide();
		},

		ongetOData: function(oEvent) {

			this._oListFilterState.aSearch = [];
			this._oListFilterState.aFilter = [];

			var oTabBar = this.byId("iconTabBar");
			//	oTabBar.getBinding("items");

			//	oTabBar.getBindingContext().getProperty("Ticket");

			//Fechas 
			var Fecini = this.byId("datePickerfecini").mProperties.value;

			var Fecfin = this.byId("datePickerfecfin").mProperties.value;

			//Valida y Asigna Filtro Rango de Fechas
			if (!Fecini || !Fecfin) {
				//_oListFilterState = [new Filter("FECHA_I", FilterOperator.Contains, Fecini)];
				MessageBox.warning('Debe ingresar el Rango de Fechas', null, "Mensaje del sistema", "OK", null);
				this.fnCloseBusyDialog(); //Cerrar Cargando
				return;
			} else {
				this._oListFilterState.aFilter.push(new Filter("Credatetk", FilterOperator.BT, Fecini, Fecfin));
				var oCredatetkFilters = "Credatetk ge datetime'" + Fecini + "' and Credatetk le datetime'" + Fecfin + "'";
			}

			//Numero de Ticket
			var NumTicket = this.byId("INumTicket").mProperties.value;
			var oTicketFilters;
			if (NumTicket !== "") {
				oTicketFilters = " Ticket eq '" + NumTicket + "'";
				this._oListFilterState.aFilter = [new Filter("Ticket", FilterOperator.Contains, NumTicket)];
			}

			var i = 0;
			var oBukrsFilters;
			//Adiciona Filtros por Sociedad
			if (this._selectedSociedadItems.length > 0) {
				for (i = 0; i < this._selectedSociedadItems.length; i++) {

					//this._selectedSociedadItems.push( selectedItems[i].getKey() );
					this._oListFilterState.aFilter.push(new Filter("Bukrs", FilterOperator.EQ, this._selectedSociedadItems[i]));

					if (!oBukrsFilters) {
						oBukrsFilters = " Bukrs eq '" + this._selectedSociedadItems[i] + "'";
					} else {
						oBukrsFilters = oBukrsFilters + " or Bukrs eq '" + this._selectedSociedadItems[i] + "'";
					}
				}

			}
			//Adiciona Filtros por Torre
			var oCodtorreFilters;
			if (this._selectedTorreItems.length > 0) {
				for (i = 0; i < this._selectedTorreItems.length; i++) {
					this._oListFilterState.aFilter.push(new Filter("Codtorre", FilterOperator.EQ, this._selectedTorreItems[i]));

					if (!oCodtorreFilters) {
						oCodtorreFilters = " Codtorre eq '" + this._selectedTorreItems[i] + "'";
					} else {
						oCodtorreFilters = oCodtorreFilters + " or Codtorre eq '" + this._selectedTorreItems[i] + "'";
					}
				}

			}
			//Adiciona Filtros por Proceso 
			var oCodprocFilters;
			if (this._selectedProcesoItems.length > 0) {
				for (i = 0; i < this._selectedProcesoItems.length; i++) {
					this._oListFilterState.aFilter.push(new Filter("Codproc", FilterOperator.EQ, this._selectedProcesoItems[i]));
					if (!oCodprocFilters) {
						oCodprocFilters = " Codproc eq '" + this._selectedProcesoItems[i] + "'";
					} else {
						oCodprocFilters = oCodprocFilters + " or Codproc eq '" + this._selectedProcesoItems[i] + "'";
					}
				}

			}
			//Adiciona Filtros por Torre Subproceso
			var oCodtorresubprFilters;
			if (this._selectedTorreSubprItems.length > 0) {
				for (i = 0; i < this._selectedTorreSubprItems.length; i++) {
					this._oListFilterState.aFilter.push(new Filter("Codtorrehijo", FilterOperator.EQ, this._selectedTorreSubprItems[i]));

					if (!oCodtorresubprFilters) {
						oCodtorresubprFilters = " Codtorrehijo eq '" + this._selectedTorreSubprItems[i] + "'";
					} else {
						oCodtorresubprFilters = oCodtorresubprFilters + " or Codtorrehijo eq '" + this._selectedTorreSubprItems[i] + "'";
					}
				}

			}
			//Adiciona Filtros por SubProceso 
			var oCodsubprocesoFilters;
			if (this._selectedSubprocesoItems.length > 0) {
				for (i = 0; i < this._selectedSubprocesoItems.length; i++) {
					this._oListFilterState.aFilter.push(new Filter("Codprochijo", FilterOperator.EQ, this._selectedSubprocesoItems[i]));
					if (!oCodsubprocesoFilters) {
						oCodsubprocesoFilters = " Codprochijo eq '" + this._selectedSubprocesoItems[i] + "'";
					} else {
						oCodsubprocesoFilters = oCodsubprocesoFilters + " or Codprochijo eq '" + this._selectedSubprocesoItems[i] + "'";
					}
				}

			}
			//Adiciona Filtros por Status
			var oStatusFilters;
			if (this._selectedStatusItems.length > 0) {
				for (i = 0; i < this._selectedStatusItems.length; i++) {
					this._oListFilterState.aFilter.push(new Filter("Statustk", FilterOperator.EQ, this._selectedStatusItems[i]));
					if (!oStatusFilters) {
						oStatusFilters = " Statustk eq '" + this._selectedStatusItems[i] + "'";
					} else {
						oStatusFilters = oStatusFilters + " or Statustk eq '" + this._selectedStatusItems[i] + "'";
					}
				}

			}

			//Usuario Creador
			var UsuCre = this.byId("IUsuCreTicket").mProperties.value;
			var oUsuCreFilters;
			if (UsuCre !== "") {
				oUsuCreFilters = " Usercrea eq '" + UsuCre + "'";
				this._oListFilterState.aFilter = [new Filter("Usercrea", FilterOperator.Contains, UsuCre)];
			}

			//Usuario Creador
			var UsuRes = this.byId("IUsuRespPaso").mProperties.value;
			var oUsuResFilters;
			if (UsuRes !== "") {
				oUsuResFilters = " Creuser eq '" + UsuRes + "'";
				this._oListFilterState.aFilter = [new Filter("Creuser", FilterOperator.Contains, UsuRes)];
			}

			// var sQuery = oEvent.getParameter("query");

			// if (sQuery && sQuery.length > 0) {
			// 	this._oListFilterState.aSearch = [new Filter("Ticket", FilterOperator.Contains, sQuery)];
			// }

			if (this._oListFilterState.aFilter.length > 0) {
				//this._applySearchParam();

				// var oModelDataDetail = {
				// 	"items": [

				// 	]
				// };

				//Definir modelo del servicio web
				var oModelServiceArchivosCount = new sap.ui.model.odata.ODataModel(g_servicio_reporte, true);

				var Url_Servi = "/Reporte01Set";

				//var _Filters = this._oListFilterState.aSearch.concat(this._oListFilterState.aFilter);

				var oFilters = "";

				if (oCredatetkFilters) {
					oFilters = oCredatetkFilters;
				}

				//Valida si Seleccionaron filtros por Sociedad
				if (oTicketFilters) {
					oFilters = oFilters + " and ( " + oTicketFilters + " )";
				}
				//Valida si Seleccionaron filtros por Sociedad
				if (oBukrsFilters) {
					oFilters = oFilters + " and ( " + oBukrsFilters + " )";
				}
				//Valida si Seleccionaron filtros por Torre
				if (oCodtorreFilters) {
					oFilters = oFilters + " and ( " + oCodtorreFilters + " )";
				}
				//Valida si Seleccionaron filtros por Proceso
				if (oCodprocFilters) {
					oFilters = oFilters + " and ( " + oCodprocFilters + " )";
				}
				//Valida si Seleccionaron filtros por Torre hijos
				if (oCodtorresubprFilters) {
					oFilters = oFilters + " and ( " + oCodtorresubprFilters + " )";
				}
				//Valida si Seleccionaron filtros por Proceso hijos
				if (oCodsubprocesoFilters) {
					oFilters = oFilters + " and ( " + oCodsubprocesoFilters + " )";
				}

				//Valida si Seleccionaron filtros por Status
				if (oStatusFilters) {
					oFilters = oFilters + " and ( " + oStatusFilters + " )";
				}

				//Valida si Seleccionaron filtros por Usuario Creador
				if (oUsuCreFilters) {
					oFilters = oFilters + " and ( " + oUsuCreFilters + " )";
				}

				//Valida si Seleccionaron filtros por Usuario Responsable Paso
				if (oUsuResFilters) {
					oFilters = oFilters + " and ( " + oUsuResFilters + " )";
				}

				var arrParams2 = ["$filter=" + oFilters];

				this.oData = {
					//items es una propiedad del objeto oData
					items: []
				};

				//Leer datos del ERP
				var oRead = this.fnReadEntityAsync(oModelServiceArchivosCount, Url_Servi, arrParams2);

				var iTotalItems = 0,
					iTotalTickets = 0,
					iTotalItemsCerrados = 0,
					iTotalItemsAbiertos = 0,
					iTotalItemsAnulados = 0;
				if (oRead.tipo === "S") {
					if (oRead.datos.results.length > 0) {

						for (i = 0; i < oRead.datos.results.length; i++) {

							var oItem = oRead.datos.results[i];
							var oValue;

							//Valida que el registro sea un Ticket
							if (oItem.Num === 1) {
								iTotalTickets++;
								switch (oItem.Statustk) {
									case "00":
										oItem.highlight = "Warning";
										iTotalItemsAbiertos++;
										break;
									case "10":
										oItem.highlight = "Success";
										iTotalItemsCerrados++;
										break;
									case "15":
										oItem.highlight = "Error";
										iTotalItemsAnulados++;
										break;
									default:
										oItem.highlight = "Warning";
										iTotalItemsAbiertos++;
								}
							}

							//Aplica Formato a la Fecha
							if (oItem.Credatetk && oItem.Credatetk !== "") {
								oValue = formatter.formatDate(oItem.Credatetk);
								oItem.Credatetk = oValue;
							}
							//Aplica Formato a la Hora
							if (oItem.Cretimetk && oItem.Cretimetk !== "") {
								oValue = formatter.formatTime(oItem.Cretimetk);
								oItem.Cretimetk = oValue;
							}
							//Aplica Formato a la Fecha
							if (oItem.Upddatetk && oItem.Upddatetk !== "") {
								oValue = formatter.formatDate(oItem.Upddatetk);
								oItem.Upddatetk = oValue;
							}
							//Aplica Formato a la Hora
							if (oItem.Updtimetk && oItem.Updtimetk !== "") {
								oValue = formatter.formatTime(oItem.Updtimetk);
								oItem.Updtimetk = oValue;
							}
							//Aplica Formato a la Hora
							if (oItem.Horas && oItem.Horas !== "") {
								oValue = formatter.formatTime(oItem.Horas);
								oItem.Horas = oValue;
							}
							//Aplica Formato a la Fecha
							if (oItem.Zdate && oItem.Zdate !== "") {
								oValue = formatter.formatDate(oItem.Zdate);
								oItem.Zdate = oValue;
							}
							//Aplica Formato a la Hora
							if (oItem.Time && oItem.Time !== "") {
								oValue = formatter.formatTime(oItem.Time);
								oItem.Time = oValue;
							}
							//Aplica Formato a la Fecha
							if (oItem.Upddate && oItem.Upddate !== "") {
								oValue = formatter.formatDate(oItem.Upddate);
								oItem.Upddate = oValue;
							}
							//Aplica Formato a la Hora
							if (oItem.Updtime && oItem.Updtime !== "") {
								oValue = formatter.formatTime(oItem.Updtime);
								oItem.Updtime = oValue;
							}
							//Aplica Formato a la Hora
							if (oItem.Horaspaso && oItem.Horaspaso !== "") {
								oValue = formatter.formatTime(oItem.Horaspaso);
								oItem.Horaspaso = oValue;
							}

							iTotalItems++;

							//this.oModelData.items.push(oItem);
							this.oData.items.push(oItem);

						}

						var oModel = new sap.ui.model.json.JSONModel();
						oModel.setData(this.oData);

						var oTable = this.byId("table");

						oTable.setModel(oModel);
						
						//---SAP.UI.TABLE
						// oTable.bindRows({
						// 	path: "/items"
						// });
						
						//oTable.getBinding().refresh(true);
						
						//---SAP.M
						oTable.bindItems({
							path: "/items",
							template: oTable.getBindingInfo("items").template
						});

						var sTitleTotal = this.getResourceBundle().getText("worklistTableCount", [iTotalTickets]);
						this.getModel("worklistView").setProperty("/worklistTableCount", sTitleTotal);

						var sTitleCerrados = this.getResourceBundle().getText("worklistTableCountCerrados", [iTotalItemsCerrados]);
						this.getModel("worklistView").setProperty("/worklistTableCountCerrados", sTitleCerrados);

						var sTitleAbiertos = this.getResourceBundle().getText("worklistTableCountAbiertos", [iTotalItemsAbiertos]);
						this.getModel("worklistView").setProperty("/worklistTableCountAbiertos", sTitleAbiertos);

						var sTitleAnulados = this.getResourceBundle().getText("worklistTableCountAnulados", [iTotalItemsAnulados]);
						this.getModel("worklistView").setProperty("/worklistTableCountAnulados", sTitleAnulados);
						//this.getView().setModel(oModel, "modelPath");

					} else {
						MessageBox.error("No se encontraron datos para los parametros ingresados.", null, "Mensaje del sistema", "OK", null);
					}
				} else {
					MessageBox.error(oRead.msjs, null, "Mensaje del sistema", "OK", null);
				}
				this.fnCloseBusyDialog(); //Cerrar Cargando
			}

		},

		/**
		 * Event handler when a filter tab gets pressed
		 * @param {sap.ui.base.Event} oEvent the filter tab event
		 * @public
		 */
		onQuickFilter: function(oEvent) {
			var oBinding = this._oTable.getBinding("items"),
				sKey = oEvent.getParameter("selectedKey");

			oBinding.filter(this._mFilters[sKey]);
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

		handleViewSettingsDialogButtonPressed: function(oEvent) {
			if (!this._oDialog) {
				this._oDialog = sap.ui.xmlfragment("com.view.fragment.Dialog", this);
			}
			// toggle compact style
			jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._oDialog);
			this._oDialog.open();
		},

		handleConfirm: function(oEvent) {

			var oView = this.getView();
			var oTable = oView.byId("table");

			var mParams = oEvent.getParameters();
			var oBinding = oTable.getBinding("items");

			// apply sorter to binding
			// (grouping comes before sorting)
			var sPath;
			var bDescending;
			var vGroup;
			var aSorters = [];
			if (mParams.groupItem) {
				sPath = mParams.groupItem.getKey();
				bDescending = mParams.groupDescending;
				vGroup = this.mGroupFunctions[sPath];
				aSorters.push(new Sorter(sPath, bDescending, vGroup));
			}
			sPath = mParams.sortItem.getKey();
			bDescending = mParams.sortDescending;
			aSorters.push(new Sorter(sPath, bDescending));
			oBinding.sort(aSorters);

			// apply filters to binding
			var aFilters = [];
			jQuery.each(mParams.filterItems, function(i, oItem) {
				var aSplit2 = oItem.getKey().split("___");
				var sPath2 = aSplit2[0];
				var sOperator = aSplit2[1];
				var sValue1 = aSplit2[2];
				var sValue2 = aSplit2[3];
				var oFilter = new Filter(sPath2, sOperator, sValue1, sValue2);
				aFilters.push(oFilter);
			});
			oBinding.filter(aFilters);

			// update filter bar
			//oView.byId("vsdFilterBar").setVisible(aFilters.length > 0);
			//oView.byId("vsdFilterLabel").setText(mParams.filterString);
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

		// Test script to generate a file from JavaScript such

		emitXmlHeader: function() {
			var headerRow = '<ss:Row>\n';
			for (var colName in testTypes) {
				headerRow += '  <ss:Cell>\n';
				headerRow += '    <ss:Data ss:Type="String">';
				headerRow += colName + '</ss:Data>\n';
				headerRow += '  </ss:Cell>\n';
			}
			headerRow += '</ss:Row>\n';
			return '<?xml version="1.0"?>\n' +
				'<ss:Workbook xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n' +
				'<ss:Worksheet ss:Name="Sheet1">\n' +
				'<ss:Table>\n\n' + headerRow;
		},

		emitXmlFooter: function() {
			return '\n</ss:Table>\n' +
				'</ss:Worksheet>\n' +
				'</ss:Workbook>\n';
		},

		jsonToSsXml: function(jsonObject) {
			var row;
			var col;
			var xml;
			var data = typeof jsonObject != "object" ? JSON.parse(jsonObject) : jsonObject;

			xml = this.emitXmlHeader();

			for (row = 0; row < data.length; row++) {
				xml += '<ss:Row>\n';

				for (col in data[row]) {
					xml += '  <ss:Cell>\n';
					xml += '    <ss:Data ss:Type="' + testTypes[col] + '">';
					xml += data[row][col] + '</ss:Data>\n';
					xml += '  </ss:Cell>\n';
				}

				xml += '</ss:Row>\n';
			}

			xml += this.emitXmlFooter();
			return xml;
		},

		download: function(content, filename, contentType) {
			if (!contentType) {
				contentType = 'application/octet-stream';
			}

			//var a = document.getElementById('test');
			var a = this.byId("test").getDomRef();

			var blob = new Blob([content], {
				'type': contentType
			});
			a.href = window.URL.createObjectURL(blob);
			a.download = filename;

			window.location.assign(a.href);
		},

		onDataExport3: function() {
			//?$format=xlsx

			// that MS Excel will honor non-ASCII characters.

			testJson = this.oModelData.items;

			console.log(this.jsonToSsXml(testJson));

			this.download(this.jsonToSsXml(testJson), 'test.xls', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

		},

		onDataExport1: sap.m.Table.prototype.exportData || function(oEvent) {

			var oTable = this.byId("table");

			var aColumns = oTable.getColumns();
			var aItems = oTable.getItems();
			var aTemplate = [];
			for (var i = 0; i < aColumns.length; i++) {
				var oColumn = {
					name: aColumns[i].getHeader().getText(),
					template: {
						content: {
							path: null
						}
					}
				};
				if (aItems.length > 0) {
					if (aItems[0].getCells()[i].mProperties.text) {
						oColumn.template.content.path = aItems[0].getCells()[i].getBinding("text").getPath();
					} else if (aItems[0].getCells()[i].mProperties.title) {
						oColumn.template.content.path = aItems[0].getCells()[i].getBinding("title").getPath();
					} else if (aItems[0].getCells()[i].mProperties.number) {
						oColumn.template.content.path = aItems[0].getCells()[i].getBinding("number").getPath();
					}

				}
				aTemplate.push(oColumn);
			}
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
				models: oTable.getModel(),

				// binding information for the rows aggregation
				rows: {
					path: "/Repor"
				},

				// column definitions with column name and binding info for the content
				columns: aTemplate

			});
			console.log(oExport);
			// download exported file
			oExport.saveFile().catch(function(oError) {
				MessageBox.error("Error when downloading data. Browser might not be supported!\n\n" + oError);
			}).then(function() {
				oExport.destroy();
			});
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
				models: this.byId("table").getModel(),

				// binding information for the rows aggregation
				rows: {
					path: "/items"
				},

				// column definitions with column name and binding info for the content
				// columns: this.byId("table").getModel("modelPath").getData().items
				columns: [{
					name: "Num",
					template: {
						content: "{Num}"
					}
				}, {
					name: "No. Tic.",
					template: {
						content: "{Ticket}"
					}
				}, {
					name: "Soc.",
					template: {
						content: "{Bukrs}"
					}
				}, {
					name: "Cod. Tor.",
					template: {
						content: "{Codtorre}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Destorre}"
					}
				}, {
					name: "Cod Proc",
					template: {
						content: "{Codproc}"
					}
				}, {
					name: "Descripción Proceso",
					template: {
						content: "{Desproc}"
					}
				}, {
					name: "Estatus",
					template: {
						content: "{Statustk}"
					}
				}, {
					name: "Des st TK",
					template: {
						content: "{Desstattk}"
					}
				}, {
					name: "Usuario Cr",
					template: {
						content: "{Usercrea}"
					}
				}, {
					name: "Fecha Creac",
					template: {
						content: "{Credatetk}"
					}
				}, {
					name: "Hora Creac",
					template: {
						content: "{Cretimetk}"
					}
				}, {
					name: "Fecha Cier",
					template: {
						content: "{Upddatetk}"
					}
				}, {
					name: "Hora Cierr",
					template: {
						content: "{Updtimetk}"
					}
				}, {
					name: "Dias Trans",
					template: {
						content: "{Dias}"
					}
				}, {
					name: "Horas Trans",
					template: {
						content: "{Horas}"
					}
				}, {
					name: "Subclasifi",
					template: {
						content: "{Despostip}"
					}
				}, {
					name: "T. Paso Fiori",
					template: {
						content: "{Tipp}"
					}
				}, {
					name: "Pas. Proc",
					template: {
						content: "{Pasoproc}"
					}
				}, {
					name: "Texto del paso Fiori",
					template: {
						content: "{Txtpaso}"
					}
				}, {
					name: "Status P.",
					template: {
						content: "{Status}"
					}
				}, {
					name: "Des st PP",
					template: {
						content: "{Desstat}"
					}
				}, {
					name: "Niv.",
					template: {
						content: "{Numniv}"
					}
				}, {
					name: "T. Subpr",
					template: {
						content: "{Codtorrehijo}"
					}
				}, {
					name: "Torre Subp",
					template: {
						content: "{Destorrehijo}"
					}
				}, {
					name: "Cod. Subpr",
					template: {
						content: "{Codprochijo}"
					}
				}, {
					name: "Subproceso",
					template: {
						content: "{Desprochijo}"
					}
				}, {
					name: "Opc. Bif",
					template: {
						content: "{Opcbifur}"
					}
				}, {
					name: "Respuesta",
					template: {
						content: "{Txopbif}"
					}
				}, {
					name: "Cargo Us Paso",
					template: {
						content: "{Cargo}"
					}
				}, {
					name: "Cargo Usuario del Paso",
					template: {
						content: "{Descargo}"
					}
				}, {
					name: "Usuario del Paso",
					template: {
						content: "{Creuser}"
					}
				}, {
					name: "Usuario del Paso",
					template: {
						content: "{Nomuser}"
					}
				}, {
					name: "Fecha Crea",
					template: {
						content: "{Zdate}"
					}
				}, {
					name: "Hora Creac",
					template: {
						content: "{Time}"
					}
				}, {
					name: "Fecha Cierr",
					template: {
						content: "{Upddate}"
					}
				}, {
					name: "Hora Cierr",
					template: {
						content: "{Updtime}"
					}
				}, {
					name: "Dias Trans",
					template: {
						content: "{Diaspaso}"
					}
				}, {
					name: "Horas Trans",
					template: {
						content: "{Horaspaso}"
					}
				}, {
					name: "Tipo de Compra",
					template: {
						content: "{Tipcomp}"
					}
				}, {
					name: "Moneda",
					template: {
						content: "{Waers}"
					}
				}, {
					name: "Valor Comp",
					template: {
						content: "{Valcomp}"
					}
				}, {
					name: "Num. Comp",
					template: {
						content: "{Documento}"
					}
				}]
			});
			console.log(oExport);
			// download exported file
			oExport.saveFile("DatosTickets").catch(function(oError) {
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
				this._selectedSociedadItems.push(selectedItems[i].getKey());
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

			this._selectedTorreItems = [];
			for (var i = 0; i < selectedItems.length; i++) {
				messageText += "'" + selectedItems[i].getText() + "'";
				this._selectedTorreItems.push(selectedItems[i].getKey());
				if (i !== selectedItems.length - 1) {
					messageText += ",";
				}
			}

			messageText += "]";

			/*MessageToast.show(messageText, {
				width: "auto"
			});*/
		},

		handleSelectionProcesoFinish: function(oEvent) {
			var selectedItems = oEvent.getParameter("selectedItems");
			var messageText = "Event 'selectionFinished': [";

			this._selectedProcesoItems = [];
			for (var i = 0; i < selectedItems.length; i++) {
				messageText += "'" + selectedItems[i].getText() + "'";
				this._selectedProcesoItems.push(selectedItems[i].getKey());
				if (i !== selectedItems.length - 1) {
					messageText += ",";
				}
			}

			messageText += "]";

			/*MessageToast.show(messageText, {
				width: "auto"
			});*/
		},

		handleSelectionTorreSubprFinish: function(oEvent) {
			var selectedItems = oEvent.getParameter("selectedItems");
			var messageText = "Event 'selectionFinished': [";

			this._selectedTorreSubprItems = [];
			for (var i = 0; i < selectedItems.length; i++) {
				messageText += "'" + selectedItems[i].getText() + "'";
				this._selectedTorreSubprItems.push(selectedItems[i].getKey());
				if (i !== selectedItems.length - 1) {
					messageText += ",";
				}
			}

			messageText += "]";

			/*MessageToast.show(messageText, {
				width: "auto"
			});*/
		},

		handleSelectionSubprocesoFinish: function(oEvent) {
			var selectedItems = oEvent.getParameter("selectedItems");
			var messageText = "Event 'selectionFinished': [";

			this._selectedSubprocesoItems = [];
			for (var i = 0; i < selectedItems.length; i++) {
				messageText += "'" + selectedItems[i].getText() + "'";
				this._selectedSubprocesoItems.push(selectedItems[i].getKey());
				if (i !== selectedItems.length - 1) {
					messageText += ",";
				}
			}

			messageText += "]";

			/*MessageToast.show(messageText, {
				width: "auto"
			});*/
		},

		handleSelectionStatusFinish: function(oEvent) {
			var selectedItems = oEvent.getParameter("selectedItems");
			var messageText = "Event 'selectionFinished': [";

			this._selectedStatusItems = [];
			for (var i = 0; i < selectedItems.length; i++) {
				messageText += "'" + selectedItems[i].getText() + "'";
				this._selectedStatusItems.push(selectedItems[i].getKey());
				if (i !== selectedItems.length - 1) {
					messageText += ",";
				}
			}

			messageText += "]";

			/*MessageToast.show(messageText, {
				width: "auto"
			});*/
		},

		onAfterRendering: function() {
			if (!this.oDataUsuarios) {
				this.fnConsultarMathCodeUsuarios();
			}

		},

		fnConsultarMathCodeUsuarios: function() {

			//Url Servicio
			var sServiceUrl = this.getView().getModel().sServiceUrl;
			//Definir modelo del servicio web
			var oModelService = new sap.ui.model.odata.ODataModel(sServiceUrl, true);
			//Definir filtro

			//Leer datos del ERP
			var oRead = this.fnReadEntity(oModelService, "/UsuariosSet", null);

			if (oRead.tipo === "S") {
				this.oDataUsuarios = oRead.datos.results;

			} else {
				MessageBox.error(oRead.msjs, null, "Mensaje del sistema", "OK", null);
			}
		},

		fnUsuariosCre: function() {

			this.fnOpenDialog("com.view.fragment.UsuariosCre");

			//this._oDialog = sap.ui.xmlfragment("com.view.fragment.Dialog", this);
			//this.fnConsultarUsuarios();
		},

		fnUsuariosRes: function() {

			this.fnOpenDialog("com.view.fragment.UsuariosRes");

			//this._oDialog = sap.ui.xmlfragment("com.view.fragment.Dialog", this);
			//this.fnConsultarUsuarios();
		},

		// fnConsultarUsuarios: function() {

		// 	var oDataUsuarios = "";
		// 	//SI el modelo NO existe, se crea.
		// 	if (!oDataUsuarios) {
		// 		oDataUsuarios = {
		// 			lstItemsSociedad: []
		// 		};
		// 	}

		// 	oDataUsuarios.lstItemsUsuarios = this.oDataUsuarios;
		// 	var oLista = sap.ui.getCore().getElementById("lstUsuarios");
		// 	var oModel = new sap.ui.model.json.JSONModel(oDataUsuarios);
		// 	oLista.setModel(oModel);

		// },

		fnBuscarUsuariosCre: function(oEvent) {
			var sQuery = oEvent.getParameter("value");
			var filters = [],
				filter1 = "",
				filter2 = "";

			if (sQuery && sQuery.length > 0) {
				filter1 = new sap.ui.model.Filter("Bname", sap.ui.model.FilterOperator.Contains, sQuery);
				filter2 = new sap.ui.model.Filter("NameText", sap.ui.model.FilterOperator.Contains, sQuery);
				filters = new sap.ui.model.Filter([filter1, filter2], false);
				// filters = [new sap.ui.model.Filter("Maktx", sap.ui.model.FilterOperator.Contains, sQuery)];
			}

			// Update list binding
			sap.ui.getCore().byId("lstUsuariosCre").getBinding("items").filter(filters);

			//On phone devices, there is nothing to select from the list
			if (sap.ui.Device.system.phone) {
				return;
			}

		},

		fnBuscarUsuariosRes: function(oEvent) {
			var sQuery = oEvent.getParameter("value");
			var filters = [],
				filter1 = "",
				filter2 = "";

			if (sQuery && sQuery.length > 0) {
				filter1 = new sap.ui.model.Filter("Bname", sap.ui.model.FilterOperator.Contains, sQuery);
				filter2 = new sap.ui.model.Filter("NameText", sap.ui.model.FilterOperator.Contains, sQuery);
				filters = new sap.ui.model.Filter([filter1, filter2], false);
				// filters = [new sap.ui.model.Filter("Maktx", sap.ui.model.FilterOperator.Contains, sQuery)];
			}

			// Update list binding
			sap.ui.getCore().byId("lstUsuariosRes").getBinding("items").filter(filters);

			//On phone devices, there is nothing to select from the list
			if (sap.ui.Device.system.phone) {
				return;
			}

		},

		fnSeleccionarUsuarioCre: function(oEvent) {

			//Contexto del item seleccionado
			var bindingContext = oEvent.getParameters().selectedItem.getBindingContext(),
				//Asignar Valor
				oUsuarioCre = this.getView().byId("IUsuCreTicket");
			oUsuarioCre.setValue(bindingContext.getProperty("Bname"));
			//	oSociedad.setName(bindingContext.getProperty("NameText"));

			this.fnCloseFragment();
		},

		fnSeleccionarUsuarioRes: function(oEvent) {

			//Contexto del item seleccionado
			var bindingContext = oEvent.getParameters().selectedItem.getBindingContext(),
				//Asignar Valor
				oUsuarioRes = this.getView().byId("IUsuRespPaso");
			oUsuarioRes.setValue(bindingContext.getProperty("Bname"));
			//	oSociedad.setName(bindingContext.getProperty("NameText"));

			this.fnCloseFragment();
		},

		/**
		 * Cerrar el fragment de Centro
		 * @public
		 */
		fnCloseFragment: function() {
			this.fnCloseDialog(this.oFragment);
			delete this.oFragment;
		},

		handleLoadItems: function(oControlEvent) {
			oControlEvent.getSource().getBinding("items").resume();
		},

		onSearchUsuCre: function(event) {
			var item = event.getParameter("suggestionItem");
			if (item) {
				sap.m.MessageToast.show("search for: " + item.getText());
			}
		},

		onSuggestUsuCre: function(event) {
			var value = event.getParameter("suggestValue");
			var filters = [];
			if (value) {
				filters = [
					new sap.ui.model.Filter([
						new sap.ui.model.Filter("Bname", function(sText) {
							return (sText || "").toUpperCase().indexOf(value.toUpperCase()) > -1;
						}),
						new sap.ui.model.Filter("NameText", function(sDes) {
							return (sDes || "").toUpperCase().indexOf(value.toUpperCase()) > -1;
						})
					], false)
				];
			}

			this.oSF.getBinding("suggestionItems").filter(filters);
			this.oSF.suggest();
		}

	});
});