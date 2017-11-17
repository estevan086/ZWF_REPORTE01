/*global location */
/* global numeral:true */
var gd_FecIni;
var gd_FecIni;
 
var g_servicio_reporte = "/sap/opu/odata/sap/ZSGW_REPORTES_SRV/";

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
	"sap/ui/core/util/ExportTypeCSV",
	'sap/ui/model/Sorter'
], function(BaseController, JSONModel, History, formatter, Filter, FilterOperator, MessageBox, MessageToast, Formatter, Controller,
	Export,
	ExportTypeCSV,
	Sorter) {
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
				oTableModel,
				iOriginalBusyDelay,
				oTable = this.byId("table");

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

			this._oListFilterState.aSearch = [];
			this._oListFilterState.aFilter = [];

			var oTabBar = this.byId("iconTabBar");
			//	oTabBar.getBinding("items");

			//	oTabBar.getBindingContext().getProperty("Ticket");

			var Fecini = this.byId("datePickerfecini").mProperties.value;

			var Fecfin = this.byId("datePickerfecfin").mProperties.value;

			//Valida y Asigna Filtro Rango de Fechas
			if (!Fecini || !Fecfin) {
				//_oListFilterState = [new Filter("FECHA_I", FilterOperator.Contains, Fecini)];
				//	MessageBox.warning('Debe ingresar el Rango de Fechas', null, "Mensaje del sistema", "OK", null);
				//	return;
			} else {
				this._oListFilterState.aFilter.push(new Filter("Credatetk", FilterOperator.BT, Fecini, Fecfin));
				var oCredatetkFilters = "Credatetk ge datetime'" + Fecini +"' and Credatetk le datetime'" + Fecfin + "'" ;
			}

			var i = 0;
			var oBukrsFilters;
			//Adiciona Filtros por Sociedad
			if (this._selectedSociedadItems.length > 0) {
				for (i = 0; i < this._selectedSociedadItems.length; i++) {

					//this._selectedSociedadItems.push( selectedItems[i].getKey() );
					this._oListFilterState.aFilter.push(new Filter("Bukrs", FilterOperator.EQ, this._selectedSociedadItems[i]));
					
					if (!oBukrsFilters){
						oBukrsFilters = " Bukrs eq '" + this._selectedSociedadItems[i] +"'" ;
					}
					else{
						oBukrsFilters = oBukrsFilters + " or Bukrs eq '" + this._selectedSociedadItems[i] +"'"  ;
					}
				}

			}
			//Adiciona Filtros por Torre
			var oCodtorreFilters;
			if (this._selectedTorreItems.length > 0) {
				for (i = 0; i < this._selectedTorreItems.length; i++) {
					this._oListFilterState.aFilter.push(new Filter("Codtorre", FilterOperator.EQ, this._selectedTorreItems[i]));
					
					if (!oCodtorreFilters){
						oCodtorreFilters = " Codtorre eq '" + this._selectedTorreItems[i] +"'" ;
					}
					else{
						oCodtorreFilters = oCodtorreFilters + " or Codtorre eq '" + this._selectedTorreItems[i] +"'"  ;
					}
				}

			}
			//Adiciona Filtros por Proceso 
			var oCodprocFilters;
			if (this._selectedProcesoItems.length > 0) {
				for (i = 0; i < this._selectedProcesoItems.length; i++) {
					this._oListFilterState.aFilter.push(new Filter("Codproc", FilterOperator.EQ, this._selectedProcesoItems[i]));
					if (!oCodprocFilters){
						oCodprocFilters = " Codproc eq '" + this._selectedProcesoItems[i] +"'" ;
					}
					else{
						oCodprocFilters = oCodprocFilters + " or Codproc eq '" + this._selectedProcesoItems[i] +"'"  ;
					}
				}

			}
			//Adiciona Filtros por Status
			var oStatusFilters;
			if (this._selectedStatusItems.length > 0) {
				for (i = 0; i < this._selectedStatusItems.length; i++) {
					this._oListFilterState.aFilter.push(new Filter("Statustk", FilterOperator.EQ, this._selectedStatusItems[i]));
					if (!oStatusFilters){
						oStatusFilters = " Statustk eq '" + this._selectedStatusItems[i] +"'" ;
					}
					else{
						oStatusFilters = oStatusFilters + " or Statustk eq '" + this._selectedStatusItems[i] +"'"  ;
					}
				}

			}

			var sQuery = oEvent.getParameter("query");

			if (sQuery && sQuery.length > 0) {
				this._oListFilterState.aSearch = [new Filter("Ticket", FilterOperator.Contains, sQuery)];
			}

			if (this._oListFilterState.aFilter.length > 0) {
				//this._applySearchParam();

				var oModelData = {
					"items": [

					]
				};
				
				var oModelDataDetail = {
					"items": [

					]
				};

				//Definir modelo del servicio web
				var oModelServiceArchivosCount = new sap.ui.model.odata.ODataModel(g_servicio_reporte, true);

				var Url_Servi = "/Reporte01Set" ;
				
				var _Filters = this._oListFilterState.aSearch.concat(this._oListFilterState.aFilter);

				var oFilters = oCredatetkFilters;
				//Valida si Seleccionaron filtros por Sociedad
				if (oBukrsFilters){
					oFilters = oFilters + " and ( "+ oBukrsFilters + " )" ;
				}
				//Valida si Seleccionaron filtros por Torre
				if (oCodtorreFilters){
					oFilters = oFilters + " and ( "+ oCodtorreFilters + " )" ;
				}
				//Valida si Seleccionaron filtros por Proceso
				if (oCodprocFilters){
					oFilters = oFilters + " and ( "+ oCodprocFilters + " )" ;
				}
				//Valida si Seleccionaron filtros por Status
				if (oStatusFilters){
					oFilters = oFilters + " and ( "+ oStatusFilters + " )" ;
				}
				var arrParams2 = ["$filter=" + oFilters ];
				
				//Leer datos del ERP
				var oRead = this.fnReadEntity(oModelServiceArchivosCount, Url_Servi, arrParams2);
				var iTotalItems = 0 , iTotalItemsCerrados = 0 , iTotalItemsAbiertos = 0 , iTotalItemsAnulados = 0 ;
				if (oRead.tipo === "S") {
					if (oRead.datos.results.length > 0) {

						for (i = 0; i < oRead.datos.results.length; i++) {

							var oItem = oRead.datos.results[i];

							//if (oItem.Num === 1) {
								switch (oItem.Statustk) {
									case "00":
										oItem.highlight = "Warning";
										iTotalItemsAbiertos ++;
										break;
									case "10":
										oItem.highlight = "Success";
										iTotalItemsCerrados ++;
										break;
									case "15":
										oItem.highlight = "Error";
										iTotalItemsAnulados ++;
										break;	
									default:
										oItem.highlight = "Warning";
										iTotalItemsAbiertos ++;
								}
								iTotalItems ++;
								oModelData.items.push(oItem);
							//}

							//oModelDataDetail.items.push(oItem);
						}

						var oModel = new sap.ui.model.json.JSONModel();
						oModel.setData(oModelData);

						var oTable = this.byId("table");

						oTable.setModel(oModel, "modelPath"); 
						//oTable.bindItems(oModel, "modelPath"); 

						var sTitleTotal = this.getResourceBundle().getText("worklistTableCount", [iTotalItems]);
						this.getModel("worklistView").setProperty("/worklistTableCount", sTitleTotal);
						
						var sTitleCerrados = this.getResourceBundle().getText("worklistTableCountCerrados", [iTotalItemsCerrados]);
						this.getModel("worklistView").setProperty("/worklistTableCountCerrados", sTitleCerrados);
						
						var sTitleAbiertos = this.getResourceBundle().getText("worklistTableCountAbiertos", [iTotalItemsAbiertos]);
						this.getModel("worklistView").setProperty("/worklistTableCountAbiertos", sTitleAbiertos);
						
						var sTitleAnulados = this.getResourceBundle().getText("worklistTableCountAnulados", [iTotalItemsAnulados]);
						this.getModel("worklistView").setProperty("/worklistTableCountAnulados", sTitleAnulados);
						//this.getView().setModel(oModel, "modelPath");

					}
				} else {
					MessageBox.error(oRead.msjs, null, "Mensaje del sistema", "OK", null);
				}
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
		
		handleViewSettingsDialogButtonPressed: function (oEvent) {
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
			jQuery.each(mParams.filterItems, function (i, oItem) {
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
						}
						else if (aItems[0].getCells()[i].mProperties.title){
								oColumn.template.content.path = aItems[0].getCells()[i].getBinding("title").getPath();
						}
						else if (aItems[0].getCells()[i].mProperties.number){
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
					path: "/"
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
					path: "/Reporte01Set"
				},

				// column definitions with column name and binding info for the content
				columns: this.byId("table").getModel("modelPath").getData().items
				// columns: [{
				// 	name: "Num",
				// 	template: {
				// 		content: "{Num}"
				// 	}
				// }, {
				// 	name: "Ticket",
				// 	template: {
				// 		content: "{Ticket}"
				// 	}
				// }]	
				/*}, {
					name: "Sociedad",
					template: {
						content: "{Bukrs}"
					}
				}, {
					name: "Cod Torre",
					template: {
						content: "{Codtorre}"
					}
				}, {
					name: "Des Torre",
					template: {
						content: "{Destorre}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Codproc}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Desproc}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Statustk}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Desstattk}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Usercrea}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Credatetk}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Cretimetk}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Upddatetk}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Updtimetk}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Despostip}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Tipp}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Pasoproc}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Txtpaso}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Status}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Desstat}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Codtorrehijo}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Destorrehijo}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Codprochijo}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Desprochijo}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Opcbifur}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Txopbif}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Cargo}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Descargo}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Creuser}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Nomuser}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Zdate}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Time}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Upddate}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Updtime}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Tipcomp}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Waers}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Valcomp}"
					}
				}, {
					name: "Torre",
					template: {
						content: "{Documento}"
					}*/
				// }]
			});
			console.log(oExport);
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
		}

	});
});