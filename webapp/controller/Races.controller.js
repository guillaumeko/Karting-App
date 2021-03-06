sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/Filter",
	"sap/ui/model/json/JSONModel"
], function(Controller, Filter, JSONModel) {
	"use strict";
	return Controller.extend("KartingReportingApp.controller.Races", {

		onInit: function() {
			this.setNoDataText();
			this.i18n = this.getModel("i18n").getResourceBundle();
			this.buildFilterModel();

			this.aKeys				= ["YearRace", "RaceId", "TournamentId", "LocationId"];
			this.oSelectYearRace	= this.getView().byId("race-year-filter");
			this.oSelectName		= this.getView().byId("race-name-filter");
			this.oSelectTournament	= this.getView().byId("race-tournament-filter");
			this.oSelectLocation	= this.getView().byId("race-location-filter");
			
			this.getModel("config").setProperty("/Filter/text", this.i18n.getText("noFilter"));
			this.addSnappedLabel();
		},

		onExit: function () {
			this.aKeys		= [];
			this.aFilters	= [];
			this.oModel 	= null;
		},
		
		buildFilterModel: function () {
			var filterModel = new sap.ui.model.json.JSONModel();
			var i18n		= this.getModel("i18n").getResourceBundle();

			this.getModel().read("/RaceSet/", {
        		success: function(oData, oResponse) {
        			function pushData(data, key, name) {
        				var intermediateArray = [];
						for (var count = 0; count < data.results.length; count++) {
            				intermediateArray.push({ "key" : data.results[count][key], "name" : data.results[count][name] });
            			}
            			var finalArray = [{ "key" : "", "name" : i18n.getText("All") }];
            			for (var counter = 0; counter < intermediateArray.length; counter++) {
            				if (intermediateArray[counter].key !== finalArray[counter].key) {
            					finalArray.push(intermediateArray[counter]);
            				}
            			}
            			return finalArray;
                    }

            		filterModel.setData({
            			RacesDatesArray:		pushData(oData, "YearRace", "YearRace"),
            			RacesIdArray:			pushData(oData, "RaceId", "RaceName"),
            			RacesLocationArray: 	pushData(oData, "LocationId", "LocationId"),
            			RacesTournamentArray:	pushData(oData, "TournamentId", "TournamentId")
            		});
        		},
        		error: function(error) { }
			});
			this.getView().setModel(filterModel,"filterModel");
		},

		goToRaceDetail: function(oEvent) { 
			var oItem	= oEvent.getSource();
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("race", { racePath: oItem.getBindingContext().getPath().substr(1) });
		},

		onToggleHeader: function () {
			this.getView().byId("racePage").setHeaderExpanded(!this.getView().byId("racePage").getHeaderExpanded());
		},
		
		onClearFilters: function () {
			this.filterTable(["", "", "", ""]);
			this.oSelectYearRace.setSelectedKey(0);
			this.oSelectName.setSelectedKey(0);
			this.oSelectTournament.setSelectedKey(0);
			this.oSelectLocation.setSelectedKey(0);
		},

		formatToggleButtonText: function(bValue){
			return bValue ? this.i18n.getText("collapseFilters") : this.i18n.getText("expandFilters");
		},

		onSelectChange: function() {
			var aCurrentFilterValues = [];
			aCurrentFilterValues.push(this.getSelectedItemText(this.oSelectYearRace));
			aCurrentFilterValues.push(this.getSelectedItemText(this.oSelectName));
			aCurrentFilterValues.push(this.getSelectedItemText(this.oSelectTournament));
			aCurrentFilterValues.push(this.getSelectedItemText(this.oSelectLocation));
			this.filterTable(aCurrentFilterValues);
		},

		filterTable: function (aCurrentFilterValues) {
			this.getView().byId("table_races").getBinding("items").filter(this.getFilters(aCurrentFilterValues));
			this.updateFilterCriterias(this.getFilterCriteria(aCurrentFilterValues));
		},

		updateFilterCriterias: function (aFilterCriterias) {
			this.removeSnappedLabel(); /* because in case of label with an empty text, */
			this.addSnappedLabel(); /* a space for the snapped content will be allocated and can lead to title misalignment */
			this.getView().byId("clearFilters").setVisible(true);
			this.getModel("config").setProperty("/Filter/text", this.getFormattedSummaryText(aFilterCriterias));
		},

		addSnappedLabel: function() {
			var oSnappedLabel = this.getSnappedLabel();
			oSnappedLabel.attachBrowserEvent("click", this.onToggleHeader, this);
			this.getView().byId("racePage").getTitle().addSnappedContent(oSnappedLabel);
		},

		removeSnappedLabel: function() {
			this.getView().byId("racePage").getTitle().destroySnappedContent();
		},

		getFilters: function (aCurrentFilterValues) {
			this.aFilters = [];
			this.aFilters = this.aKeys.map(function (sCriteria, i) {
				return new sap.ui.model.Filter(sCriteria, sap.ui.model.FilterOperator.Contains, aCurrentFilterValues[i]);
			});
			return this.aFilters;
		},

		getFilterCriteria: function (aCurrentFilterValues){
			return this.aKeys.filter(function (el, i) {
				if (aCurrentFilterValues[i] !== "") { return  el; }
			});
		},

		getFormattedSummaryText: function (aFilterCriterias) {
			return aFilterCriterias.length > 0
				? this.i18n.getText("FilteredBy") + " (" + aFilterCriterias.length + "): " + aFilterCriterias.join(", ")
				: this.i18n.getText("noFilter");
		},

		getSelectedItemText: function (oSelect) {
			return oSelect.getSelectedItem() ? oSelect.getSelectedItem().getKey() : "";
		},

		getSnappedLabel : function () {
			return new sap.m.Label({ text: "{/Filter/text}" });
		},

		setNoDataText: function() {
			var i18n	= this.getModel("i18n").getResourceBundle();
			var oModel	= this.getModel();
			var object	= this.byId("table_races");
			
			oModel.attachRequestSent(function(){
				sap.ui.core.BusyIndicator.show(0);
			}).attachRequestFailed(function(){
				object.setNoDataText(i18n.getText("dataRequestFailed"));
			}).attachMetadataFailed(function(mArguments){
				var error = mArguments.getParameters();
				object.setNoDataText(error.statusCode + " " + error.statusText + ". " + error.response.body);
			}).attachRequestCompleted(function() {
				sap.ui.core.BusyIndicator.hide();
				object.setNoDataText(
					this.bindList("$metadata").getLength() === 0 
						? i18n.getText("noData") 
						: i18n.getText("unknownError")
				);
			});
		},

		getModel: function(name) {
    		return this.getView().getModel(name) || this.getOwnerComponent().getModel(name);
		}

	});
});