# 🔐 Supabase RLS Policies Verifikation Guide

**Dato:** 23. juli 2025  
**Status:** ⚠️ **VERIFIKATION PÅKRÆVET**  
**For:** System Administrator  

---

## 📋 **Oversigt**

Denne guide hjælper dig med at verificere at Row Level Security (RLS) policies er korrekt implementeret i Supabase Dashboard. RLS er **kritisk** for database-niveau sikkerhed og sikrer at brugere kun kan tilgå deres egen data.

---

## 🚨 **Kritiske RLS Policies Der Skal Verificeres**

### **1. Users Tabel**
**Formål:** Kun admin kan læse alle brugere

```sql
-- Policy: Only admins can read all users
CREATE POLICY "Only admins can read all users" ON "user"
FOR SELECT USING (
  auth.jwt() ->> 'app_metadata' ->> 'roles' ? 'admin'
);
```

### **2. Driver Data Tabel**
**Formål:** Brugere kan kun se deres egen data

```sql
-- Policy: Users can only see their own data
CREATE POLICY "Users can only see their own data" ON "driver_data"
FOR ALL USING (auth.uid() = owner);
```

### **3. Mail Config Tabel**
**Formål:** Kun admin kan tilgå mail konfiguration

```sql
-- Policy: Only admins can access mail config
CREATE POLICY "Only admins can access mail config" ON "mail_config"
FOR ALL USING (
  auth.jwt() ->> 'app_metadata' ->> 'roles' ? 'admin'
);
```

### **4. Mail Logs Tabel**
**Formål:** Kun admin kan se mail logs

```sql
-- Policy: Only admins can see mail logs
CREATE POLICY "Only admins can see mail logs" ON "mail_logs"
FOR ALL USING (
  auth.jwt() ->> 'app_metadata' ->> 'roles' ? 'admin'
);
```

---

## 🔍 **Verifikationsproces**

### **Trin 1: Log ind på Supabase Dashboard**

1. Gå til [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Log ind med din admin konto
3. Vælg dit Fiskelogistikgruppen projekt

### **Trin 2: Verificer RLS Status**

1. Gå til **Authentication** → **Policies**
2. Tjek at **RLS er aktiveret** for alle tabeller
3. Verificer at alle tabeller har mindst én policy

### **Trin 3: Verificer Hver Tabel**

#### **Users Tabel:**
- [ ] RLS er aktiveret
- [ ] Policy "Only admins can read all users" eksisterer
- [ ] Policy er aktiv (Enabled = true)

#### **Driver Data Tabel:**
- [ ] RLS er aktiveret
- [ ] Policy "Users can only see their own data" eksisterer
- [ ] Policy bruger `auth.uid() = owner` condition

#### **Mail Config Tabel:**
- [ ] RLS er aktiveret
- [ ] Policy "Only admins can access mail config" eksisterer
- [ ] Policy tjekker for admin role

#### **Mail Logs Tabel:**
- [ ] RLS er aktiveret
- [ ] Policy "Only admins can see mail logs" eksisterer
- [ ] Policy tjekker for admin role

---

## 🧪 **Test RLS Policies**

### **Test 1: Admin Adgang**
```sql
-- Kør som admin bruger
SELECT * FROM driver_data LIMIT 5;
-- Forventet: Kan se alle data (hvis admin policy tillader det)
```

### **Test 2: Almindelig Bruger Adgang**
```sql
-- Kør som almindelig bruger
SELECT * FROM driver_data WHERE owner = auth.uid() LIMIT 5;
-- Forventet: Kan kun se egen data
```

### **Test 3: Uautoriseret Adgang**
```sql
-- Kør uden authentication
SELECT * FROM driver_data LIMIT 5;
-- Forventet: Ingen data returneret (tom resultat)
```

---

## 📊 **RLS Policy Template**

Hvis policies mangler, brug disse templates:

### **For Users Tabel:**
```sql
-- Aktiver RLS
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;

-- Opret admin-only policy
CREATE POLICY "Only admins can read all users" ON "user"
FOR SELECT USING (
  auth.jwt() ->> 'app_metadata' ->> 'roles' ? 'admin'
);
```

### **For Driver Data Tabel:**
```sql
-- Aktiver RLS
ALTER TABLE driver_data ENABLE ROW LEVEL SECURITY;

-- Opret owner-based policy
CREATE POLICY "Users can only see their own data" ON driver_data
FOR ALL USING (auth.uid() = owner);
```

### **For Mail Config Tabel:**
```sql
-- Aktiver RLS
ALTER TABLE mail_config ENABLE ROW LEVEL SECURITY;

-- Opret admin-only policy
CREATE POLICY "Only admins can access mail config" ON mail_config
FOR ALL USING (
  auth.jwt() ->> 'app_metadata' ->> 'roles' ? 'admin'
);
```

---

## ⚠️ **Almindelige Problemer**

### **Problem 1: RLS ikke aktiveret**
**Symptom:** Alle brugere kan se alle data
**Løsning:** Aktiver RLS på tabellen

### **Problem 2: Manglende policies**
**Symptom:** Ingen brugere kan se data
**Løsning:** Opret policies for tilladte operationer

### **Problem 3: Forkert policy condition**
**Symptom:** Brugere kan se andres data
**Løsning:** Verificer `auth.uid() = owner` condition

### **Problem 4: Admin role ikke anerkendt**
**Symptom:** Admin kan ikke se alle data
**Løsning:** Verificer admin role i app_metadata

---

## 📋 **Verifikations Checklist**

### **Pre-verifikation:**
- [ ] Supabase Dashboard adgang
- [ ] Admin konto tilgængelig
- [ ] Projekt identificeret

### **RLS Status:**
- [ ] RLS aktiveret på alle tabeller
- [ ] Ingen tabeller uden policies
- [ ] Alle policies er aktive

### **Policy Verifikation:**
- [ ] Users tabel: Admin-only læsning
- [ ] Driver data: Owner-based adgang
- [ ] Mail config: Admin-only adgang
- [ ] Mail logs: Admin-only adgang

### **Test Verifikation:**
- [ ] Admin kan tilgå alle data
- [ ] Almindelig bruger kan kun se egen data
- [ ] Uautoriseret adgang blokeret

---

## 🎯 **Success Criteria**

### **RLS er korrekt implementeret hvis:**
- ✅ Alle tabeller har RLS aktiveret
- ✅ Alle tabeller har mindst én policy
- ✅ Admin kan tilgå alle data
- ✅ Almindelig bruger kan kun se egen data
- ✅ Uautoriseret adgang returnerer tomme resultater

### **Hvis kriterierne ikke er opfyldt:**
1. **Aktiver RLS** på manglende tabeller
2. **Opret policies** for manglende tabeller
3. **Test policies** med forskellige brugerroller
4. **Dokumenter ændringer** i denne guide

---

## 📞 **Support**

Hvis du støder på problemer:

1. **Tjek Supabase dokumentation:** [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
2. **Kontakt system administrator** for hjælp
3. **Dokumenter problemet** i denne guide

---

## 🏆 **Konklusion**

RLS policies er **kritiske** for database sikkerhed. Uden korrekte policies kan alle autentificerede brugere tilgå alle data, hvilket underminerer hele sikkerhedsstrategien.

**Verificer RLS policies før production deployment!** 