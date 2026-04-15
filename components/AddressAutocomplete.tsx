"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google: any;
  }
}

export type ParsedAddress = {
  formattedAddress: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  lat: number | null;
  lng: number | null;
};

type AddressAutocompleteProps = {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (value: string) => void;
  onSelectAddress: (address: ParsedAddress) => void;
  inputClassName?: string;
  hideLabel?: boolean;
};

function getComponent(
  components: any[] | undefined,
  type: string,
  short = false
) {
  const found = components?.find((c) => c.types?.includes(type));
  if (!found) return "";
  return short ? found.short_name : found.long_name;
}

function parsePlace(place: any): ParsedAddress {
  const components = place?.address_components || [];
  const location = place?.geometry?.location;

  const city =
    getComponent(components, "locality") ||
    getComponent(components, "postal_town") ||
    getComponent(components, "sublocality") ||
    getComponent(components, "administrative_area_level_2");

  return {
    formattedAddress: place?.formatted_address || "",
    city,
    province: getComponent(components, "administrative_area_level_1", true),
    postalCode: getComponent(components, "postal_code"),
    country: getComponent(components, "country"),
    lat: location ? Number(location.lat()) : null,
    lng: location ? Number(location.lng()) : null,
  };
}

export default function AddressAutocomplete({
  label,
  placeholder,
  value,
  onChangeText,
  onSelectAddress,
  inputClassName = "",
  hideLabel = false,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.google?.maps?.places) {
      setReady(true);
      return;
    }

    const existing = document.querySelector(
      'script[data-google-places="true"]'
    ) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener("load", () => setReady(true));
      if (window.google?.maps?.places) setReady(true);
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.setAttribute("data-google-places", "true");
    script.onload = () => setReady(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!ready || !inputRef.current || autocompleteRef.current) return;
    if (!window.google?.maps?.places) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        fields: ["formatted_address", "address_components", "geometry"],
        componentRestrictions: { country: ["ca"] },
      }
    );

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();
      if (!place?.formatted_address || !place.geometry) return;

      const parsed = parsePlace(place);
      onChangeText(parsed.formattedAddress);
      onSelectAddress(parsed);
    });
  }, [ready, onChangeText, onSelectAddress]);

  return (
    <div className="w-full">
      {!hideLabel && label ? (
        <label className="mb-2 block text-sm font-semibold text-yellow-400">
          {label}
        </label>
      ) : null}

      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={inputClassName}
      />
    </div>
  );
}