sap.ui.define([
		"sap/ui/core/mvc/Controller"
	], function (Controller) {
		"use strict";

		return Controller.extend("com.controller.BaseController", {
			/**
			 * Convenience method for accessing the router.
			 * @public
			 * @returns {sap.ui.core.routing.Router} the router for this component
			 */
			getRouter : function () {
				return sap.ui.core.UIComponent.getRouterFor(this);
			},

			/**
			 * Convenience method for getting the view model by name.
			 * @public
			 * @param {string} [sName] the model name
			 * @returns {sap.ui.model.Model} the model instance
			 */
			getModel : function (sName) {
				return this.getView().getModel(sName);
			},

			/**
			 * Convenience method for setting the view model.
			 * @public
			 * @param {sap.ui.model.Model} oModel the model instance
			 * @param {string} sName the model name
			 * @returns {sap.ui.mvc.View} the view instance
			 */
			setModel : function (oModel, sName) {
				return this.getView().setModel(oModel, sName);
			},

			/**
			 * Getter for the resource bundle.
			 * @public
			 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
			 */
			getResourceBundle : function () {
				return this.getOwnerComponent().getModel("i18n").getResourceBundle();
			},

			/**
			 * Event handler when the share by E-Mail button has been clicked
			 * @public
			 */
			onShareEmailPress : function () {
				var oViewModel = (this.getModel("objectView") || this.getModel("worklistView"));
				sap.m.URLHelper.triggerEmail(
					null,
					oViewModel.getProperty("/shareSendEmailSubject"),
					oViewModel.getProperty("/shareSendEmailMessage")
				);
			},
			
					/**
		 * Consumir servicio READ
		 * @public
		 * @param {object} pModel Modelo del Servicio Web
		 * @param {string} pEntidad Nombre de la entidad a consumir
		 * @param {object} pFilters Objeto con los filtros definidos
		 */
		fnReadEntity: function(pModelo, pEntidad, pFilters) {
			var vMensaje = null;
			var oMensaje = {};

			var fnSucess = function(data, response) {
				oMensaje.tipo = "S";
				oMensaje.datos = data;
			};
			var fnError = function(e) {
				vMensaje = JSON.parse(e.response.body);
				vMensaje = vMensaje.error.message.value;

				oMensaje.tipo = "E";
				oMensaje.msjs = vMensaje;
			};

			pModelo.read(pEntidad, null, pFilters, false, fnSucess, fnError);

			return oMensaje;
		},
		
		//Dialogos "Cargando"
		/**
		 * Mostrar el fragment de Clientes
		 * @public
		 */
		fnOpenBusyDialog: function() {
			this.fnOpenDialog("com.view.fragment.BusyDialog");
		},
		/**
		 * Cerrar el fragment de Clientes
		 * @public
		 */
		fnCloseBusyDialog: function() {
			this.fnCloseDialog(this.oFragment);
			delete this.oFragment;
		},
		
		
		fnReadEntityAsync: function(pModelo, pEntidad, pFilters) {
			var vMensaje = null;
			var oMensaje = {};

			var fnSucess = function(data, response) {
				oMensaje.tipo = "S";
				oMensaje.datos = data;
			};
			var fnError = function(e) {
				vMensaje = JSON.parse(e.response.body);
				vMensaje = vMensaje.error.message.value;

				oMensaje.tipo = "E";
				oMensaje.msjs = vMensaje;
			};



			pModelo.read(pEntidad, null, pFilters, false, fnSucess, fnError, true);

			return oMensaje;
		},		
		/**
		 * Abrir Fragment.
		 * @public
		 * @param {string} pFragment es Ruta.NombreFragment a abrir
		 */
		fnOpenDialog: function(sRutaFragment) {
			// var ruta = "com.alfa.fragment.PedCrossSelling";
			// var ruta = "com.alfa.fragment.Clientes";
			this.oFragment = new Object();
			this.oFragment.view = null;

			this.fnLoadDialog(sRutaFragment, this.oFragment);
			this.oFragment.view.open();
		},
		/**
		 * Instanciar Fragment.
		 * @public
		 * @param {string} sRutaFragment es Ruta.NombreFragment a instanciar
		 * @param {object} objFragment Objeto global contenedor del fragment
		 * @returns {object}
		 */
		fnLoadDialog: function(sRutaFragment, objFragment) {
			if (objFragment.view) {
				return;
			}
			// associate controller with the fragment
			objFragment.view = sap.ui.xmlfragment(sRutaFragment, this);
			this.getView().addDependent(objFragment.view);
		},
		
		/**
		 * Cerrar Fragment.
		 * @public
		 * @param {object} objFragment Objeto global contenedor del fragment
		 */
		fnCloseDialog: function(objFragment) {
			//objFragment.view.close();
			objFragment.view.destroy();
		}

		});

	}
);