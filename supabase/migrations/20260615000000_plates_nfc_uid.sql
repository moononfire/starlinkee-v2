alter table plates
  add column if not exists nfc_uid text unique;

create index if not exists plates_nfc_uid_idx on plates (nfc_uid) where nfc_uid is not null;
