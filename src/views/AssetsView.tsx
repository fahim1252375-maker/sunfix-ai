import React, { useState } from 'react';
import { Box, ChevronRight, Edit3, Plus, Search } from 'lucide-react';
import { useSunFix } from '../context/SunFixContext';
import { TOKENS } from '../theme/tokens';
import type { Asset } from '../types/sunfix';

export const AssetsView: React.FC = () => {
  const {
    route,
    assets,
    cases,
    selectedAssetId,
    setSelectedAssetId,
    setSelectedTwinComponentId,
    addOrUpdateAsset,
    navigate,
  } = useSunFix();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const [formName, setFormName] = useState('');
  const [formSiteType, setFormSiteType] = useState<Asset['siteType']>('commercial');
  const [formLocation, setFormLocation] = useState('');
  const [formCapacity, setFormCapacity] = useState('25');
  const [formInverterModel, setFormInverterModel] = useState('');
  const [formInverterSerial, setFormInverterSerial] = useState('');
  const [formBatteryModel, setFormBatteryModel] = useState('');
  const [formBatteryKwh, setFormBatteryKwh] = useState('30');
  const [formPanelCount, setFormPanelCount] = useState('60');

  const openAddModal = () => {
    setEditingAsset(null);
    setFormName('');
    setFormSiteType('commercial');
    setFormLocation('');
    setFormCapacity('25');
    setFormInverterModel('HelioCore X25-PRO');
    setFormInverterSerial('HC-2026-1001');
    setFormBatteryModel('VoltVault LFP-30');
    setFormBatteryKwh('30');
    setFormPanelCount('60');
    setShowModal(true);
  };

  const openEditModal = (a: Asset) => {
    setEditingAsset(a);
    setFormName(a.name);
    setFormSiteType(a.siteType);
    setFormLocation(a.locationLabel);
    setFormCapacity(String(a.capacityKw));
    setFormInverterModel(a.inverterModel);
    setFormInverterSerial(a.inverterSerial);
    setFormBatteryModel(a.batteryModel || '');
    setFormBatteryKwh(String(a.batteryCapacityKwh || 0));
    setFormPanelCount(String(a.panelCount));
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formLocation.trim() || !formInverterModel.trim()) return;

    const capacityKw = Math.max(0.5, Number.parseFloat(formCapacity) || 10);
    const panelCount = Math.max(1, Number.parseInt(formPanelCount, 10) || 24);
    const batteryCapacityKwh = Math.max(0, Number.parseFloat(formBatteryKwh) || 0);
    const now = new Date().toISOString();

    const baseComponents = editingAsset?.components || [
      {
        id: `comp-pv-${Date.now()}`,
        assetId: editingAsset?.id || 'pending',
        twinId: 'solar_panel' as const,
        type: 'solar_panel' as const,
        name: `PV Array (${panelCount} modules)`,
        modelIdentifier: `${Math.round((capacityKw * 1000) / panelCount)}W Module Array`,
        serialNumber: `PV-${Date.now().toString().slice(-5)}`,
        status: 'nominal' as const,
        lastInspectionAt: now,
        notes: 'Registered in SunFix Field.',
      },
      {
        id: `comp-inv-${Date.now()}`,
        assetId: editingAsset?.id || 'pending',
        twinId: 'inverter' as const,
        type: 'inverter' as const,
        name: formInverterModel,
        modelIdentifier: formInverterModel,
        serialNumber: formInverterSerial || 'INV-001',
        status: 'nominal' as const,
        lastInspectionAt: now,
        notes: 'Primary grid-tie inverter.',
      },
      {
        id: `comp-bat-${Date.now()}`,
        assetId: editingAsset?.id || 'pending',
        twinId: 'battery' as const,
        type: 'battery' as const,
        name: formBatteryModel || 'ESS Battery Bank',
        modelIdentifier: formBatteryModel || 'LFP Storage',
        serialNumber: `BAT-${Date.now().toString().slice(-5)}`,
        status: 'nominal' as const,
        lastInspectionAt: now,
        notes: `${batteryCapacityKwh} kWh storage unit.`,
      },
      {
        id: `comp-grid-${Date.now()}`,
        assetId: editingAsset?.id || 'pending',
        twinId: 'grid_meter' as const,
        type: 'grid_meter' as const,
        name: 'AC Disconnect & Grid Meter',
        modelIdentifier: 'GridGuard 200A',
        serialNumber: `GG-${Date.now().toString().slice(-5)}`,
        status: 'nominal' as const,
        lastInspectionAt: now,
        notes: 'PCC utility interconnect.',
      },
    ];

    const saved = addOrUpdateAsset({
      id: editingAsset?.id,
      name: formName.trim(),
      siteType: formSiteType,
      locationLabel: formLocation.trim(),
      capacityKw,
      status: editingAsset?.status || 'nominal',
      inverterModel: formInverterModel.trim(),
      inverterSerial: formInverterSerial.trim() || 'SN-PENDING',
      batteryModel: formBatteryModel.trim() || undefined,
      batteryCapacityKwh,
      panelCount,
      installedYear: editingAsset?.installedYear || 2026,
      lastInspectionAt: editingAsset?.lastInspectionAt || now,
      isDemo: editingAsset ? editingAsset.isDemo : false,
      components: baseComponents,
    });

    setShowModal(false);
    setSelectedAssetId(saved.id);
    navigate('asset-detail', { assetId: saved.id });
  };

  const filteredAssets = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.locationLabel.toLowerCase().includes(search.toLowerCase()) ||
      a.inverterModel.toLowerCase().includes(search.toLowerCase()),
  );

  const detailAsset = assets.find((a) => a.id === selectedAssetId) || assets[0];
  const assetCases = cases.filter((c) => c.assetId === detailAsset.id);

  if (route === 'asset-detail') {
    return (
      <div className="space-y-6">
        <div
          className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b"
          style={{ borderColor: TOKENS.hairline }}
        >
          <div>
            <button
              type="button"
              onClick={() => navigate('assets')}
              className="text-xs hover:underline mb-1"
              style={{ color: TOKENS.brass }}
            >
              ← Back to Assets
            </button>
            <h1 className="font-display text-2xl sm:text-3xl" style={{ color: TOKENS.bone }}>
              {detailAsset.name}
            </h1>
            <p className="text-sm" style={{ color: TOKENS.sage }}>
              {detailAsset.locationLabel} · {detailAsset.capacityKw} kW · {detailAsset.siteType}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => openEditModal(detailAsset)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium"
              style={{
                backgroundColor: TOKENS.moss,
                borderColor: TOKENS.hairlineStrong,
                color: TOKENS.bone,
              }}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Installation
            </button>
            <button
              type="button"
              onClick={() => navigate('digital-twin', { assetId: detailAsset.id })}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
            >
              <Box className="w-4 h-4" />
              Open Digital Twin
            </button>
          </div>
        </div>

        {/* Specs Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border rounded-xl p-4" style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}>
            <div className="text-xs" style={{ color: TOKENS.sage }}>Inverter</div>
            <div className="text-sm font-semibold mt-1" style={{ color: TOKENS.bone }}>
              {detailAsset.inverterModel}
            </div>
            <div className="text-xs font-mono-tech mt-0.5" style={{ color: TOKENS.sage }}>
              {detailAsset.inverterSerial}
            </div>
          </div>
          <div className="border rounded-xl p-4" style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}>
            <div className="text-xs" style={{ color: TOKENS.sage }}>Battery Storage</div>
            <div className="text-sm font-semibold mt-1" style={{ color: TOKENS.bone }}>
              {detailAsset.batteryModel || 'None configured'}
            </div>
            <div className="text-xs font-mono-tech mt-0.5" style={{ color: TOKENS.sage }}>
              {detailAsset.batteryCapacityKwh || 0} kWh
            </div>
          </div>
          <div className="border rounded-xl p-4" style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}>
            <div className="text-xs" style={{ color: TOKENS.sage }}>PV Modules</div>
            <div className="font-mono-tech text-xl font-semibold mt-1 tabular-nums" style={{ color: TOKENS.bone }}>
              {detailAsset.panelCount}
            </div>
          </div>
          <div className="border rounded-xl p-4" style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}>
            <div className="text-xs" style={{ color: TOKENS.sage }}>Asset Status</div>
            <div
              className="font-mono-tech text-xl font-semibold uppercase mt-1"
              style={{
                color:
                  detailAsset.status === 'fault'
                    ? TOKENS.terracotta
                    : detailAsset.status === 'warning'
                      ? TOKENS.amberWarn
                      : TOKENS.mint,
              }}
            >
              {detailAsset.status}
            </div>
          </div>
        </div>

        {/* Component Registry */}
        <div
          className="border rounded-xl p-5 space-y-4"
          style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
        >
          <h2 className="font-display text-lg" style={{ color: TOKENS.bone }}>
            Registered Subsystems & Components
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs" style={{ borderColor: TOKENS.hairlineStrong, color: TOKENS.sage }}>
                  <th className="py-2 pr-4">Component</th>
                  <th className="py-2 pr-4">Model / Serial</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: TOKENS.hairline }}>
                {detailAsset.components.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 pr-4">
                      <div className="font-medium" style={{ color: TOKENS.bone }}>{c.name}</div>
                      <div className="text-xs" style={{ color: TOKENS.sage }}>{c.notes}</div>
                    </td>
                    <td className="py-3 pr-4 font-mono-tech text-xs" style={{ color: TOKENS.sage }}>
                      {c.modelIdentifier} · {c.serialNumber}
                    </td>
                    <td
                      className="py-3 pr-4 font-mono-tech text-xs uppercase"
                      style={{
                        color:
                          c.status === 'fault'
                            ? TOKENS.terracotta
                            : c.status === 'warning'
                              ? TOKENS.amberWarn
                              : TOKENS.mint,
                      }}
                    >
                      {c.status}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTwinComponentId(c.twinId);
                          navigate('digital-twin', { assetId: detailAsset.id });
                        }}
                        className="text-xs hover:underline whitespace-nowrap"
                        style={{ color: TOKENS.brass }}
                      >
                        Inspect in 3D
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Maintenance Case History */}
        <div
          className="border rounded-xl p-5 space-y-3"
          style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
        >
          <h2 className="font-display text-lg" style={{ color: TOKENS.bone }}>
            Previous & Open Maintenance Cases ({assetCases.length})
          </h2>
          {assetCases.length === 0 ? (
            <p className="text-xs" style={{ color: TOKENS.sage }}>
              No diagnostic cases logged for this installation yet.
            </p>
          ) : (
            <div className="divide-y" style={{ borderColor: TOKENS.hairline }}>
              {assetCases.map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium" style={{ color: TOKENS.bone }}>{c.title}</div>
                    <div className="text-xs" style={{ color: TOKENS.sage }}>
                      {c.componentName} · {c.status} · {new Date(c.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('diagnostic-results', { caseId: c.id })}
                    className="px-3 py-1.5 rounded-lg border text-xs"
                    style={{
                      backgroundColor: TOKENS.mossRaised,
                      borderColor: TOKENS.hairlineStrong,
                      color: TOKENS.brass,
                    }}
                  >
                    Open Case
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b"
        style={{ borderColor: TOKENS.hairline }}
      >
        <div>
          <span className="text-xs font-mono-tech uppercase tracking-wider" style={{ color: TOKENS.brass }}>
            Site Registry
          </span>
          <h1 className="font-display text-2xl sm:text-3xl mt-1" style={{ color: TOKENS.bone }}>
            Solar installation <em className="italic" style={{ color: TOKENS.brass }}>assets</em>
          </h1>
          <p className="text-sm mt-1" style={{ color: TOKENS.sage }}>
            Manage photovoltaic sites, inverter/battery serials, and component digital twins.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0"
          style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
        >
          <Plus className="w-4 h-4" />
          Add Solar Installation
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: TOKENS.sage }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search site name, location, or inverter model..."
          aria-label="Search solar installations"
          className="w-full border rounded-lg pl-9 pr-4 py-2.5 text-sm"
          style={{
            backgroundColor: TOKENS.moss,
            borderColor: TOKENS.hairlineStrong,
            color: TOKENS.bone,
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredAssets.map((asset) => (
          <div
            key={asset.id}
            className="border rounded-xl p-5 flex flex-col justify-between gap-4"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairline }}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="capitalize" style={{ color: TOKENS.sage }}>{asset.siteType}</span>
                <span
                  className="font-mono-tech uppercase font-semibold"
                  style={{
                    color:
                      asset.status === 'fault'
                        ? TOKENS.terracotta
                        : asset.status === 'warning'
                          ? TOKENS.amberWarn
                          : TOKENS.mint,
                  }}
                >
                  {asset.status}
                </span>
              </div>
              <h2 className="font-display text-lg" style={{ color: TOKENS.bone }}>{asset.name}</h2>
              <p className="text-xs" style={{ color: TOKENS.sage }}>{asset.locationLabel}</p>

              <div className="pt-2 space-y-1 text-xs border-t" style={{ borderColor: TOKENS.hairline, color: TOKENS.sage }}>
                <div className="flex justify-between">
                  <span>Capacity</span>
                  <span className="font-mono-tech tabular-nums" style={{ color: TOKENS.bone }}>{asset.capacityKw} kW</span>
                </div>
                <div className="flex justify-between">
                  <span>Inverter</span>
                  <span className="font-mono-tech truncate max-w-[170px]" style={{ color: TOKENS.bone }}>
                    {asset.inverterModel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Storage</span>
                  <span className="font-mono-tech tabular-nums" style={{ color: TOKENS.bone }}>
                    {asset.batteryCapacityKwh || 0} kWh
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t" style={{ borderColor: TOKENS.hairline }}>
              <button
                type="button"
                onClick={() => navigate('digital-twin', { assetId: asset.id })}
                className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
                style={{ color: TOKENS.brass }}
              >
                <Box className="w-3.5 h-3.5" />
                3D Twin
              </button>
              <button
                type="button"
                onClick={() => navigate('asset-detail', { assetId: asset.id })}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium"
                style={{
                  backgroundColor: TOKENS.mossRaised,
                  borderColor: TOKENS.hairlineStrong,
                  color: TOKENS.bone,
                }}
              >
                Details
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="w-full max-w-lg border rounded-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: TOKENS.moss, borderColor: TOKENS.hairlineStrong }}
          >
            <h2 className="font-display text-xl" style={{ color: TOKENS.bone }}>
              {editingAsset ? 'Edit Solar Installation' : 'Add Solar Installation'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block mb-1" style={{ color: TOKENS.sage }}>Installation Name</label>
                <input
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Harbor Cold Storage Array"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
                />
              </div>

              <div>
                <label className="block mb-1" style={{ color: TOKENS.sage }}>Site Type</label>
                <select
                  value={formSiteType}
                  onChange={(e) => setFormSiteType(e.target.value as Asset['siteType'])}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="microgrid">Microgrid</option>
                </select>
              </div>

              <div>
                <label className="block mb-1" style={{ color: TOKENS.sage }}>Capacity (kW)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block mb-1" style={{ color: TOKENS.sage }}>Site Location Label</label>
                <input
                  required
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="City / Sector / Roof Zone"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
                />
              </div>

              <div>
                <label className="block mb-1" style={{ color: TOKENS.sage }}>Inverter Model</label>
                <input
                  required
                  value={formInverterModel}
                  onChange={(e) => setFormInverterModel(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
                />
              </div>

              <div>
                <label className="block mb-1" style={{ color: TOKENS.sage }}>Inverter Serial</label>
                <input
                  value={formInverterSerial}
                  onChange={(e) => setFormInverterSerial(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
                />
              </div>

              <div>
                <label className="block mb-1" style={{ color: TOKENS.sage }}>Battery Model (Optional)</label>
                <input
                  value={formBatteryModel}
                  onChange={(e) => setFormBatteryModel(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
                />
              </div>

              <div>
                <label className="block mb-1" style={{ color: TOKENS.sage }}>Battery Capacity (kWh)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formBatteryKwh}
                  onChange={(e) => setFormBatteryKwh(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
                />
              </div>

              <div>
                <label className="block mb-1" style={{ color: TOKENS.sage }}>PV Panel Count</label>
                <input
                  type="number"
                  value={formPanelCount}
                  onChange={(e) => setFormPanelCount(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ backgroundColor: TOKENS.ink, borderColor: TOKENS.hairlineStrong, color: TOKENS.bone }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: TOKENS.hairline }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border text-xs font-medium"
                style={{ backgroundColor: TOKENS.mossRaised, borderColor: TOKENS.hairlineStrong, color: TOKENS.sage }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: TOKENS.brass, color: TOKENS.ink }}
              >
                Save Asset
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
