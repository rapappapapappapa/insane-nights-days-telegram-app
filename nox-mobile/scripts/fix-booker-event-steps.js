const fs = require('fs');
const path = require('path');

const destructuring = `  const {
    language,
    styles,
    formData,
    setFormData,
    eventDateTime,
    setEventDateTime,
    availableDjs,
    venues,
    loadingDjs,
    loadingVenues,
    creating,
    currentStep,
    setCurrentStep,
    djSlots,
    setDjSlots,
    slotTimePicker,
    setSlotTimePicker,
    tempSlotTime,
    setTempSlotTime,
    tempDate,
    setTempDate,
    tempTime,
    setTempTime,
    showDatePicker,
    setShowDatePicker,
    showTimePicker,
    setShowTimePicker,
    rentalPresets,
    rentalCatalogItems,
    rentalCatalogLabel,
    setRentalCatalogLabel,
    rentalCatalogQty,
    setRentalCatalogQty,
    eventRentalExtraLabel,
    setEventRentalExtraLabel,
    eventRentalExtraQty,
    setEventRentalExtraQty,
    savingRentalCatalog,
    openDatePicker,
    openTimePicker,
    openSlotTimeField,
    updateSlotTimeFromPicker,
    handleChange,
    toggleEquipmentPreset,
    toggleOrganizerLineFromCatalog,
    addEventOnlyEquipmentLine,
    removeOrganizerLineAt,
    addCatalogRow,
    removeCatalogRow,
    updateExtraTicketTier,
    addExtraTicketTier,
    removeExtraTicketTier,
    saveRentalCatalogToProfile,
    pickCoverImage,
    handleCreateEvent,
    selectedVenue,
    coverImageUri,
    navigate,
    hasBookerEventTitle,
    hasBookerEventPrice,
  } = props;
`;

const dir = path.join(__dirname, '../components/bookerEventWizard/sections');
for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith('.js')) continue;
  let c = fs.readFileSync(path.join(dir, file), 'utf8');
  c = c.replace(/export default function \w+\(props\) \{\s*return \(\s*/, (m) =>
    m.replace('return (', destructuring + '\n  return (\n')
  );
  c = c.replace(/\s*\{currentStep === \d+ && \(\s*/g, '\n');
  c = c.replace(/\s*\)\}\s*\n\s*\);\s*\n\}/, '\n  );\n}');
  c = c.replace(/\s*\)\}\s*$/, '');
  fs.writeFileSync(path.join(dir, file), c);
  console.log('fixed', file);
}

// Fix main page duplicate return + draft gate + duplicate form
const mainPath = path.join(__dirname, '../screens/dashboard/BookerEventDashboardPage.js');
let main = fs.readFileSync(mainPath, 'utf8');
main = main.replace(/\n  return \(\n  return \(/, '\n  return (');
main = main.replace(
  /if \(draftGate\) \{[\s\S]*?\}\n\n  const shared/,
  'const shared'
);
main = main.replace(
  /<View style=\{styles\.form\}>\n\n          \{currentStep/,
  '{currentStep'
);
main = main.replace(
  /\}\n        <\/View>\n      <\/ScrollView>/,
  '}\n      </ScrollView>'
);
fs.writeFileSync(mainPath, main);

// Hook: import React for useLayoutEffect
const hookPath = path.join(__dirname, '../hooks/useBookerEventWizard.js');
let hook = fs.readFileSync(hookPath, 'utf8');
if (!hook.includes("import React")) {
  hook = hook.replace(
    "import { useState, useEffect, useRef, useCallback }",
    "import React, { useState, useEffect, useRef, useCallback }"
  );
  fs.writeFileSync(hookPath, hook);
}

console.log('done');
