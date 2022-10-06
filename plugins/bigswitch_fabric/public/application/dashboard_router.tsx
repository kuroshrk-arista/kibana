/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './index.scss';
import React, { useState, useEffect } from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { parse, ParsedQuery } from 'query-string';
import { render, unmountComponentAtNode } from 'react-dom';
import { Switch, Route, RouteComponentProps, HashRouter, Redirect } from 'react-router-dom';

import { first } from 'rxjs/operators';
import { DashboardListing } from './listing';
import { DashboardApp } from './dashboard_app';
import { addHelpMenuToAppChrome, DashboardPanelStorage } from './lib';
import { createDashboardListingFilterUrl } from '../dashboard_constants';
import { getDashboardPageTitle, dashboardReadonlyBadge } from '../dashboard_strings';
import { createDashboardEditUrl, DashboardConstants } from '../dashboard_constants';
import { DashboardAppServices, DashboardEmbedSettings, RedirectToProps } from './types';
import {
  DashboardFeatureFlagConfig,
  DashboardSetupDependencies,
  DashboardStart,
  DashboardStartDependencies,
} from '../plugin';

import { createKbnUrlStateStorage, withNotifyOnErrors } from '../services/kibana_utils';
import { KibanaContextProvider } from '../services/kibana_react';
import {
  AppMountParameters,
  CoreSetup,
  PluginInitializerContext,
  ScopedHistory,
} from '../services/core';
import { DashboardNoMatch } from './listing/dashboard_no_match';

export const dashboardUrlParams = {
  showTopMenu: 'show-top-menu',
  showQueryInput: 'show-query-input',
  showTimeFilter: 'show-time-filter',
  hideFilterBar: 'hide-filter-bar',
};

import { EuiTab, EuiTabbedContent, EuiTabbedContentTab, EuiTabs } from '@elastic/eui';
import { Link } from '@reach/router';
import { isNull } from 'lodash';

export interface DashboardMountProps {
  appUnMounted: () => void;
  restorePreviousUrl: () => void;

  scopedHistory: ScopedHistory<unknown>;
  element: AppMountParameters['element'];
  initializerContext: PluginInitializerContext;
  onAppLeave: AppMountParameters['onAppLeave'];
  core: CoreSetup<DashboardStartDependencies, DashboardStart>;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  usageCollection: DashboardSetupDependencies['usageCollection'];
}

export async function mountApp({
  core,
  element,
  onAppLeave,
  appUnMounted,
  scopedHistory,
  usageCollection,
  initializerContext,
  restorePreviousUrl,
  setHeaderActionMenu,
}: DashboardMountProps) {
  const [coreStart, pluginsStart, dashboardStart] = await core.getStartServices();

  const {
    navigation,
    savedObjects,
    urlForwarding,
    data: dataStart,
    share: shareStart,
    embeddable: embeddableStart,
    kibanaLegacy: { dashboardConfig },
    savedObjectsTaggingOss,
    visualizations,
  } = pluginsStart;

  const spacesApi = pluginsStart.spacesOss?.isSpacesAvailable ? pluginsStart.spacesOss : undefined;
  const activeSpaceId =
    spacesApi && (await spacesApi.getActiveSpace$().pipe(first()).toPromise())?.id;
  let globalEmbedSettings: DashboardEmbedSettings | undefined;

  const dashboardServices: DashboardAppServices = {
    navigation,
    onAppLeave,
    savedObjects,
    urlForwarding,
    usageCollection,
    core: coreStart,
    data: dataStart,
    share: shareStart,
    initializerContext,
    restorePreviousUrl,
    setHeaderActionMenu,
    chrome: coreStart.chrome,
    embeddable: embeddableStart,
    uiSettings: coreStart.uiSettings,
    scopedHistory: () => scopedHistory,
    indexPatterns: dataStart.indexPatterns,
    savedQueryService: dataStart.query.savedQueries,
    savedObjectsClient: coreStart.savedObjects.client,
    dashboardPanelStorage: new DashboardPanelStorage(
      core.notifications.toasts,
      activeSpaceId || 'default'
    ),
    savedDashboards: dashboardStart.getSavedDashboardLoader(),
    savedObjectsTagging: savedObjectsTaggingOss?.getTaggingApi(),
    allowByValueEmbeddables: initializerContext.config.get<DashboardFeatureFlagConfig>()
      .allowByValueEmbeddables,
    dashboardCapabilities: {
      //hideWriteControls: dashboardConfig.getHideWriteControls(),
      hideWriteControls: true,
      show: Boolean(coreStart.application.capabilities.dashboard.show),
      saveQuery: Boolean(coreStart.application.capabilities.dashboard.saveQuery),
      createNew: Boolean(coreStart.application.capabilities.dashboard.createNew),
      mapsCapabilities: { save: Boolean(coreStart.application.capabilities.maps?.save) },
      createShortUrl: Boolean(coreStart.application.capabilities.dashboard.createShortUrl),
      visualizeCapabilities: { save: Boolean(coreStart.application.capabilities.visualize?.save) },
      storeSearchSession: Boolean(coreStart.application.capabilities.dashboard.storeSearchSession),
    },
    visualizations,
  };

  const getUrlStateStorage = (history: RouteComponentProps['history']) =>
    createKbnUrlStateStorage({
      history,
      useHash: coreStart.uiSettings.get('state:storeInSessionStorage'),
      ...withNotifyOnErrors(core.notifications.toasts),
    });
  const base_path = scopedHistory.createHref({ pathname: '#/' + DashboardConstants.VIEW_DASHBOARD_URL });
  const default_path = base_path + '/Flows';
  const redirect = (routeProps: RouteComponentProps, redirectTo: RedirectToProps) => {
    const historyFunction = redirectTo.useReplace
      ? scopedHistory.replace
      : scopedHistory.push;
    let destination = default_path;
    /*     if (redirectTo.destination === 'dashboard') {
          destination = redirectTo.id
            ? createDashboardEditUrl(redirectTo.id, redirectTo.editMode)
            : DashboardConstants.CREATE_NEW_DASHBOARD_URL;
        } else {
          destination = createDashboardListingFilterUrl(redirectTo.filter);
        } */
    historyFunction(destination);
  };

  const getDashboardEmbedSettings = (
    routeParams: ParsedQuery<string>
  ): DashboardEmbedSettings | undefined => {
    return {
      forceShowTopNavMenu: Boolean(routeParams[dashboardUrlParams.showTopMenu]),
      forceShowQueryInput: Boolean(routeParams[dashboardUrlParams.showQueryInput]),
      forceShowDatePicker: Boolean(routeParams[dashboardUrlParams.showTimeFilter]),
      forceHideFilterBar: Boolean(routeParams[dashboardUrlParams.hideFilterBar]),
    };
  };
  var render_count = 0;
  const renderDashboard = (routeProps: RouteComponentProps<{ id?: string }>) => {
    render_count += 1;
    const routeParams = parse(routeProps.history.location.search);
    if (routeParams.embed && !globalEmbedSettings) {
      globalEmbedSettings = getDashboardEmbedSettings(routeParams);
    }
    return (
      <DashboardApp
        history={routeProps.history}
        embedSettings={globalEmbedSettings}
        savedDashboardId={routeProps.match.params.id}
        redirectTo={(props: RedirectToProps) => redirect(routeProps, props)}
      />
    );
  };

  const renderNoMatch = (routeProps: RouteComponentProps) => {
    return <DashboardNoMatch history={routeProps.history} />;
  };

  // make sure the index pattern list is up to date
  await dataStart.indexPatterns.clearCache();

  // dispatch synthetic hash change event to update hash history objects
  // this is necessary because hash updates triggered by using popState won't trigger this event naturally.
  const unlistenParentHistory = scopedHistory.listen(() => {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  function FabricTabs(props: any) {
    useEffect(() => {
      scopedHistory.push('#' + DashboardConstants.VIEW_DASHBOARD_URL + '/' + props.selectedTabId);
    }, []);

    const onSelectedTabChanged = (id: any) => {
      props.setSelectedTabId(id);
      scopedHistory.push('#' + DashboardConstants.VIEW_DASHBOARD_URL + '/' + id);
    };
    const tabs = props.tabs.map((tab: any, index: any) => (
      <EuiTab
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === props.selectedTabId}
        key={index}>
        {tab.name}
      </EuiTab>
    ));

    return <EuiTabs>{tabs}</EuiTabs>;
  }

  const reverse_route_map = new Map();
  const production_tabs = [
    {
      id: 'sFlow',
      name: 'sFlow',
    },
    {
      id: 'NetFlow',
      name: 'NetFlow',
    },
    {
      id: 'TCPConn',
      name: 'TCP Flow',
    },
    {
      id: 'Flows',
      name: 'Flows',
    },
    {
      id: 'Filters_and_Flows',
      name: 'Filters & Flows',
    },
    {
      id: 'TrackedHosts',
      name: 'ARP',
    },
    {
      id: 'DHCP',
      name: 'DHCP',
    },
    {
      id: 'DNS',
      name: 'DNS',
    },
    {
      id: 'ICMP',
      name: 'ICMP',
    },
    {
      id: 'Bro_IDS',
      name: 'Zeek'
    },
  ];

  const re = /#\/view\/(\w+)/g;

  const getSelectedTab2ndLevel = (level_one_tab : string ) => {
      const location = scopedHistory.location;
      re.lastIndex = 0;
      const matches = re.exec(location.hash);
      if (matches && reverse_route_map.get(matches[1]) === level_one_tab) {
        return matches[1];
      }
      return null;
  };
  function ProductionNetwork() {

    let initial_tab = getSelectedTab2ndLevel( 'prod' );
    initial_tab = initial_tab ? initial_tab : 'Flows';
    const [selectedTabId, setSelectedTabId] = useState(initial_tab);

    useEffect(() => {
      return scopedHistory.listen( () => {
        const tab_id = getSelectedTab2ndLevel( 'prod' );
        if( tab_id ) {
          setSelectedTabId(tab_id);
        }
      });
    }, [scopedHistory]);

    return <FabricTabs
      selectedTabId={selectedTabId}
      setSelectedTabId={setSelectedTabId}
      tabs={production_tabs}
    />
  }


  const dmf_tabs = [
    {
      id: 'DMF_PolicyStats',
      name: 'Policy Statistics'
    },
    {
      id: 'DMF_IfStats',
      name: 'Interface Statistics'
    },
    {
      id: 'Service_Node',
      name: 'SN Statistics'
    },
    {
      id: 'DMF_Events',
      name: 'Events'
    }
  ];

  function DmfNetwork() {
    let initial_tab = getSelectedTab2ndLevel( 'dmf' );
    initial_tab = initial_tab ? initial_tab : 'DMF_PolicyStats';
    const [selectedTabId, setSelectedTabId] = useState(initial_tab);

    useEffect(() => {
      return scopedHistory.listen( () => {
        const tab_id = getSelectedTab2ndLevel( 'dmf' );
        if( tab_id ) {
          setSelectedTabId(tab_id);
        }
      });
    }, [scopedHistory]);

    return <FabricTabs
      selectedTabId={selectedTabId}
      setSelectedTabId={setSelectedTabId}
      tabs={dmf_tabs}
    />
  }

  const system_tabs = [
    {
      id: 'Configuration',
      name: 'Configuration'
    },
    {
      id: 'About',
      name: 'About'
    }
  ];

  function System() {
    let initial_tab = getSelectedTab2ndLevel( 'system' );
    initial_tab = initial_tab ? initial_tab : 'Configuration';
    const [selectedTabId, setSelectedTabId] = useState(initial_tab);

    useEffect(() => {
      return scopedHistory.listen( () => {
        const tab_id = getSelectedTab2ndLevel( 'system' );
        if( tab_id ) {
          setSelectedTabId(tab_id);
        }
      });
    }, [scopedHistory]);

    return <FabricTabs
      selectedTabId={selectedTabId}
      setSelectedTabId={setSelectedTabId}
      tabs={system_tabs}
    />
  }

  const first_level_tabs = [
    {
      id: 'prod',
      name: 'Production Network',
      content: <ProductionNetwork />
    },
    {
      id: 'dmf',
      name: 'DMF Network',
      content: <DmfNetwork />
    },
    {
      id: 'system',
      name: 'System',
      content: <System />,
    }
  ]

  production_tabs.forEach(function (tab, index) {
    reverse_route_map.set(tab.id, 'prod');
  });

  dmf_tabs.forEach(function (tab, index) {
    reverse_route_map.set(tab.id, 'dmf');
  });

  system_tabs.forEach(function (tab, index) {
    reverse_route_map.set(tab.id, 'system');
  });

  function LevelOneRouter() {
    const getLocationFromTab = () => {
      const location = scopedHistory.location;
      re.lastIndex = 0;
      const matches = re.exec(location.hash);
      const selected_tab_name = matches ? matches[1] : 'Flows';
      const selected_tab_id = reverse_route_map.get(selected_tab_name);
      let selected_tab = first_level_tabs.find(tab => tab.id === selected_tab_id);
      selected_tab = selected_tab ? selected_tab : first_level_tabs[0];
      return selected_tab;
    };
    const current_tab = getLocationFromTab();
    const [selectedTabId, setSelectedTabId] = useState(current_tab.id);

    useEffect(() => {
      return scopedHistory.listen( () => {
        const tab = getLocationFromTab();
        setSelectedTabId(tab.id);
      });
    }, [scopedHistory]);

    const setSelectedTab = (tab: EuiTabbedContentTab) => {
      setSelectedTabId(tab.id);
    }

    const selected_tab = first_level_tabs.find(tab => tab.id === selectedTabId);

    return (
      <EuiTabbedContent
        tabs={first_level_tabs}
        selectedTab={selected_tab}
        onTabClick={setSelectedTab}
      />
    );
  }

  const app = (
    <I18nProvider>
      <KibanaContextProvider services={dashboardServices}>
        <HashRouter>
          <LevelOneRouter />
          <Switch>
            <Route
              path={[
                `${DashboardConstants.VIEW_DASHBOARD_URL}/:id`,
              ]}
              render={renderDashboard}
            />
            <Route exact path="/">
              <Redirect to={default_path} />
            </Route>
            <Route path={[base_path]}>
              <Redirect to={default_path} />
            </Route>
            <Route render={renderNoMatch} />
          </Switch>
        </HashRouter>
      </KibanaContextProvider>
    </I18nProvider>
  );

  addHelpMenuToAppChrome(dashboardServices.chrome, coreStart.docLinks);
  if (dashboardServices.dashboardCapabilities.hideWriteControls) {
    coreStart.chrome.setBadge({
      text: dashboardReadonlyBadge.getText(),
      tooltip: dashboardReadonlyBadge.getTooltip(),
      iconType: 'glasses',
    });
  }
  render(app, element);
  return () => {
    dataStart.search.session.clear();
    unlistenParentHistory();
    unmountComponentAtNode(element);
    appUnMounted();
  };
}
