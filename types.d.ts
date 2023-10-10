export type coords = {
    lat: string|number;
    lng: string|number;
}

export type citiesResponse = {
    label:string,
    value:string,
    id:string,
    areaid:number,
    color:string,
    migun_time:number,
    mixname:string,
    rashut:string,
    label_he:string
}

export type cityObj = {
    areaId: citiesResponse["areaid"],
    name: string;
    zone: string;
    cityId: citiesResponse["id"];
    countdown: citiesResponse["migun_time"]
}

export type cityExtendedObj = cityObj & Partial<coords>
export type finalCityObj = Omit<cityExtendedObj, "areaId"|'cityId'>
    & Partial<{ shelters: number; name_en: string; zone_en: string; time: string; time_en: string; }>

export type alertType =
  | 'missiles' | 'earthQuake' | 'radiologicalEvent' | 'tsunami' | 'hostileAircraftIntrusion' | 'hazardousMaterials' | 'terroristInfiltration'
  | 'missilesDrill' | 'earthQuakeDrill' | 'radiologicalEventDrill' | 'tsunamiDrill' | 'hostileAircraftIntrusionDrill' | 'hazardousMaterialsDrill' | 'terroristInfiltrationDrill'
  | "unknown" | "none"