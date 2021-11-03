module.exports = {
    pluginOptions: {
        electronBuilder: {
            nodeIntegration: true,
            builderOptions: {
                mac: {
                    hardenedRuntime: true,
                    entitlements: "./build/entitlements.mac.inherit.plist",
                },
                appId: 'de.beyondco.expose',
                afterSign: './afterSignHook.js',
                extraResources: [
                    {
                        from: 'extra',
                        to: 'extra',
                        filter: [
                            '**/*'
                        ]
                    }
                ]
            }
        }
    }
}