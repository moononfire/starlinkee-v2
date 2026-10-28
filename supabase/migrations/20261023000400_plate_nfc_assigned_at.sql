-- When the NFC tag was assigned to a plate. assign-nfc only re-sends the plate
-- URL (which contains the secret) shortly after assignment, to allow a retry
-- when writing the chip failed; never for plates tagged long ago.
alter table plates add column if not exists nfc_assigned_at timestamptz;
