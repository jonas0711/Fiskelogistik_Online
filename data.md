# Database Dokumentation: driver_data

## Oversigt

**Table navn:** `driver_data`  
**Tabeltype:** Chauffør kørselsdata og performance metrics  
**Antal records:** Chauffører  
**Total felter:** 73

---

## Database Struktur

### Administrative Felter (5 stk.)
Disse felter findes kun i databasen og ikke i Excel-filen:

| Felt | Type | Beskrivelse |
|------|------|-------------|
| `id` | `uuid` | Primær nøgle - unik identifikator for hver record |
| `month` | `integer` | Måned som tal (6 for juni) |
| `year` | `integer` | År som tal (2025) |
| `created_at` | `timestamp with time zone` | Tidsstempel for hvornår recorden blev oprettet i databasen |
| `updated_at` | `timestamp with time zone` | Tidsstempel for seneste opdatering af recorden |

### Datafelter (68 stk.)
Disse felter mapper direkte til Excel-kolonnerne:

---

## Komplet Felt-mapping

| # | Excel Kolonne | Database Felt | Type | Beskrivelse |
|---|---------------|---------------|------|-------------|
| 1 | Chauffør | `driver_name` | `text` | Chaufførens fulde navn |
| 2 | Køretøjer | `vehicles` | `text` | Køretøjs ID eller antal |
| 3 | Forudseende kørsel (vurdering) [%] | `anticipatory_driving_assessment` | `numeric` | Procentsats for forudseende køreteknik |
| 4 | Forudseende kørsel uden kørehastighedsregulering [%] | `anticipatory_driving_without_cruise` | `numeric` | Forudseende kørsel uden fartpilot |
| 5 | Fra | `from_date` | `numeric` | Start dato som Excel serienummer |
| 6 | Til | `to_date` | `numeric` | Slut dato som Excel serienummer |
| 7 | Ø Forbrug [l/100km] | `avg_consumption_per_100km` | `numeric` | Gennemsnitligt brændstofforbrug per 100km |
| 8 | Ø Forbrug ved kørsel [l/100km] | `avg_consumption_driving` | `numeric` | Forbrug kun under aktiv kørsel |
| 9 | Ø Forbrug ved tomgang [l/t] | `avg_consumption_idling` | `numeric` | Forbrug under tomgang per time |
| 10 | Ø Rækkevidde ved forbrug [km/l] | `avg_range_per_consumption` | `numeric` | Rækkevidde per liter brændstof |
| 11 | Forbrug [l] | `total_consumption` | `numeric` | Samlet brændstofforbrug i perioden |
| 12 | Ø totalvægt [t] | `avg_total_weight` | `numeric` | Gennemsnitlig totalvægt af køretøjet |
| 13 | Kørestrækning [km] | `driving_distance` | `numeric` | Total tilbagelagt distance |
| 14 | Effektivitet [l/t/100km] | `efficiency_l_per_t_per_100km` | `numeric` | Brændstofeffektivitet per ton vægt |
| 15 | Motordriftstid [hh:mm:ss] | `engine_runtime` | `text` | Total tid med tændt motor |
| 16 | Køretid [hh:mm:ss] | `driving_time` | `text` | Aktiv køretid |
| 17 | Tomgang / stilstandstid [hh:mm:ss] | `idle_standstill_time` | `text` | Tid i tomgang eller stilstand |
| 18 | Ø-hastighed [km/h] | `avg_speed` | `numeric` | Gennemsnitshastighed |
| 19 | CO₂-emission [kg] | `co2_emission` | `numeric` | Samlet CO₂-udledning |
| 20 | Vurdering af påløbsdrift [%] | `coasting_assessment` | `numeric` | Effektivitet af påløbsdrift |
| 21 | Aktiv påløbsdrift (km) [km] | `active_coasting_km` | `numeric` | Distance kørt i aktiv påløbsdrift |
| 22 | Varigheden af aktiv påløbsdrift [hh:mm:ss] | `active_coasting_duration` | `text` | Tid brugt i aktiv påløbsdrift |
| 23 | Aktivt skubbedrev (stk.) | `active_pushing_count` | `integer` | Antal episoder med aktivt skubbedrev |
| 24 | Afstand i påløbsdrift [km] | `coasting_distance` | `numeric` | Total distance i påløbsdrift |
| 25 | Varighed af påløbsdrift med kørehastighedsregulering [hh:mm:ss] | `coasting_duration_with_cruise` | `text` | Påløbsdrift med fartpilot aktiveret |
| 26 | Antal faser i påløbsdrift | `coasting_phases_count` | `integer` | Separate påløbsfaser |
| 27 | Gaspedal-vurdering [%] | `accelerator_assessment` | `numeric` | Vurdering af gaspedalsteknik |
| 28 | Kickdown (km) [km] | `kickdown_km` | `numeric` | Distance med kickdown aktiveret |
| 29 | Varighed af brugen af kickdown [hh:mm:ss] | `kickdown_duration` | `text` | Tid med kickdown |
| 30 | Kickdown (stk.) | `kickdown_count` | `integer` | Antal kickdown aktiveringer |
| 31 | Tilbagelagt afstand ved aktivering af gaspedal og tilkoblet kørehastighedsregulering [km] | `accelerator_with_cruise_km` | `numeric` | Distance med gaspedal og fartpilot samtidig |
| 32 | Varigheden af aktivering af gaspedal og tilkoblet kørehastighedsregulering [hh:mm:ss] | `accelerator_with_cruise_duration` | `text` | Tid med begge systemer aktive |
| 33 | Antal aktiveringer af gaspedal ved kørehastighedsregulering | `accelerator_activations_with_cruise` | `integer` | Antal gaspedal aktiveringer med fartpilot |
| 34 | Forbrug uden kørehastighedsregulering [l/100km] | `consumption_without_cruise` | `numeric` | Forbrug uden fartpilot |
| 35 | Forbrug med kørehastighedsregulering [l/100km] | `consumption_with_cruise` | `numeric` | Forbrug med fartpilot aktiveret |
| 36 | Vurdering af bremseadfærd [%] | `brake_behavior_assessment` | `numeric` | Vurdering af bremsemønster |
| 37 | Driftsbremse (km) [km] | `service_brake_km` | `numeric` | Distance med driftsbremse |
| 38 | Varighed driftsbremse [hh:mm:ss] | `service_brake_duration` | `text` | Tid med driftsbremse aktiveret |
| 39 | Driftsbremse (stk.) | `service_brake_count` | `integer` | Antal driftsbremse aktiveringer |
| 40 | Afstand motorbremse [km] | `engine_brake_distance` | `numeric` | Distance med motorbremse |
| 41 | Varighed af motorbremse [hh:mm:ss] | `engine_brake_duration` | `text` | Tid med motorbremse |
| 42 | Motorbremse (tæller) | `engine_brake_count` | `integer` | Antal motorbremse aktiveringer |
| 43 | Afstand retarder [km] | `retarder_distance` | `numeric` | Distance med retarder (ofte null) |
| 44 | Varighed retarder [hh:mm:ss] | `retarder_duration` | `text` | Tid med retarder (ofte null) |
| 45 | Retarder (stk.) | `retarder_count` | `integer` | Antal retarder aktiveringer (ofte null) |
| 46 | Nødbremseassistent (tæller) | `emergency_brake_assist_count` | `integer` | Antal aktivering af nødbremseassistent |
| 47 | Vurdering af brugen af kørehastighedsregulering [%] | `cruise_control_assessment` | `numeric` | Effektivitetsvurdering af fartpilot brug |
| 48 | Afstand med kørehastighedsregulering (> 50 km/h) [km] | `cruise_distance_over_50` | `numeric` | Distance med fartpilot over 50 km/h |
| 49 | Varighed af kørehastighedsregulering (> 50 km/h) [hh:mm:ss] | `cruise_duration_over_50` | `text` | Tid med fartpilot over 50 km/h |
| 50 | Afstand > 50 km/h uden kørehastighedsregulering [km] | `distance_over_50_without_cruise` | `numeric` | Distance over 50 km/h uden fartpilot |
| 51 | Varighed uden kørehastighedsregulering > 50 km/h [hh:mm:ss] | `duration_over_50_without_cruise` | `text` | Tid over 50 km/h uden fartpilot |
| 52 | Gryde. afstand med fartpilot (> 50 km/h) [km] | `avg_cruise_distance_over_50` | `numeric` | Gennemsnitlig afstand med fartpilot |
| 53 | Vurdering overspeed | `overspeed_assessment` | `integer` | Klassifikation af hastighedsoverskridelser |
| 54 | Overspeed (km uden påløbsdrift) [km] | `overspeed_km_without_coasting` | `numeric` | Distance med overspeed uden påløbsdrift |
| 55 | Samlet anvendelse | `total_usage` | `text` | Samlet brug/klassifikation (f.eks. "let") |
| 56 | Indsatsdage | `duty_days` | `text` | Antal aktive dage (f.eks. "19 / 30") |
| 57 | Forbrug [kWh] | `electric_consumption_kwh` | `numeric` | Elektrisk energiforbrug |
| 58 | Ø Forbrug ved kørsel [kWh/km] | `electric_avg_consumption_driving` | `numeric` | Gennemsnitligt energiforbrug under kørsel |
| 59 | Gns. stilstandsforbrug [kWh/km] | `electric_avg_standstill_consumption` | `numeric` | Gennemsnitligt energiforbrug i stilstand |
| 60 | Ø Rækkevidde ved forbrug [km/kWh] | `electric_avg_range` | `numeric` | Elektrisk rækkevidde per kWh |
| 61 | Ø Forbrug [kWh/km] | `electric_total_avg_consumption` | `numeric` | Samlet gennemsnitligt elektrisk forbrug |
| 62 | Energieffektivitet [kWh/t/km] | `electric_energy_efficiency` | `numeric` | Elektrisk energieffektivitet per ton |
| 63 | Elektrisk rekreation [kWh] | `electric_recreation_kwh` | `numeric` | Energi genindvundet gennem regenerativ bremsning |
| 64 | Elektrisk genvindingsvurdering [%] | `electric_recovery_assessment` | `numeric` | Effektivitet af energigenvinding |
| 65 | Elektrisk fremsynet kørsel (vurdering) [%] | `electric_anticipatory_driving` | `numeric` | Forudseende kørsel for elektriske køretøjer |
| 66 | Elektrisk gaspedals kapacitet [%] | `electric_accelerator_capacity` | `numeric` | Udnyttelse af elektrisk gaspedal |
| 67 | Brugsvurdering af elektrisk fartpilot [%] | `electric_cruise_usage_assessment` | `numeric` | Effektivitet af elektrisk fartpilot |
| 68 | Elektrisk overhastighedsklassificering [%] | `electric_overspeed_classification` | `numeric` | Overspeed klassifikation for elektriske køretøjer |

---

## Datatype Beskrivelser

### `text/string`
- **Anvendelse:** Navne, beskrivelser, tidsformater (hh:mm:ss)
- **Eksempler:** "Andersen, Kent René", "05:03:28", "let"

### `numeric/number`
- **Anvendelse:** Alle målinger, procentsatser, afstande, vægte
- **Eksempler:** 25.6, 66.8, 5082.8
- **Kan være:** Heltal eller decimaler

### `integer`
- **Anvendelse:** Tællere og antal
- **Eksempler:** 6242 (skubbedrev), 11 (kickdown count)
- **Altid:** Hele tal uden decimaler

### `uuid`
- **Anvendelse:** Unik primær nøgle
- **Format:** Standard UUID (f.eks. 123e4567-e89b-12d3-a456-426614174000)

### `timestamp with time zone`
- **Anvendelse:** Database timestamps
- **Format:** ISO 8601 med tidszone
- **Eksempel:** "2025-07-04T10:30:00+02:00"

---

## Særlige Noter

### Dato Håndtering
- **Excel datoer** gemmes som numeriske værdier (Excel serienumre)
- **Database datoer** håndteres som `month` og `year` integers + timestamps

### Elektriske Køretøjer
- **Felter 57-68** er kun relevante for hybrid/elektriske køretøjer
- **Konventionelle køretøjer** vil have null-værdier i disse felter

### Null Værdier
- **Retarder data** (felter 43-45) er ofte null
- **Elektriske data** er null for dieselkøretøjer
- Database skal håndtere null-værdier korrekt

### Tidsformater
- **Format:** "hh:mm:ss" (f.eks. "118:32:01")
- **Gemt som:** text/string (ikke TIME datatype)
- **Kan overstige 24 timer** (f.eks. "124:15:30")



