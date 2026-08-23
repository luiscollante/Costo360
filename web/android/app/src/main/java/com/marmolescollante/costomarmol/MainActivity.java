package com.marmolescollante.costomarmol;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DownloadsSaverPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
