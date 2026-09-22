module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  const cartoApiKey = (
    process.env.EXPO_PUBLIC_CARTO_API_KEY ||
    process.env.NEXT_PUBLIC_CARTO_API_KEY ||
    "cb1_2dut_1_0bf5bd46e8782ff0b7ba6f38"
  )?.trim();

  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        ...(googleMapsApiKey
          ? {
              googleMaps: {
                apiKey: googleMapsApiKey,
              },
            }
          : {}),
      },
    },
    extra: {
      ...config.extra,
      googleMapsConfigured: Boolean(googleMapsApiKey),
      cartoApiKey,
    },
  };
};
