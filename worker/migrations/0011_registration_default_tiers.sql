UPDATE registration_settings
SET available_tiers_json = '{"T1":false,"T2":false,"T3":false,"T4":false,"T5":false,"T6":false,"T7":false,"T8":false,"T9":true,"T10":true,"T11":true,"T12":true,"T13":true,"T14":true}'
WHERE available_tiers_json = '{"T1":false,"T2":false,"T3":false,"T4":false,"T5":false,"T6":false,"T7":false,"T8":true,"T9":true,"T10":true,"T11":true,"T12":true,"T13":true,"T14":true}';
