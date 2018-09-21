/*
 * Copyright 2016-2018 Crown Copyright
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package uk.gov.gchq.gaffer.quickstart.web;

import org.apache.catalina.LifecycleException;
import org.apache.catalina.startup.Tomcat;

import javax.servlet.ServletException;

public class GafferWebServices {

    private static boolean running = false;
    private String schemaPath;
    private String storePropertiesPath;
    private String graphConfigPath;
    private String restWarPath;
    private String uiWarPath;


    public static void main(String[] args) throws ServletException, LifecycleException {

        if(args.length != 5){
            throw new IllegalArgumentException("I need a schemaPath, graphConfigPath, storePropertiesPath, restWarPath and uiWarPath");
        }

        GafferWebServices gafferWebServices = new GafferWebServices();

        gafferWebServices.setSchemaPath(args[0]);
        gafferWebServices.setGraphConfigPath(args[1]);
        gafferWebServices.setStorePropertiesPath(args[2]);
        gafferWebServices.setRestWarPath(args[3]);
        gafferWebServices.setUiWarPath(args[4]);

        gafferWebServices.startServer();

    }

    public boolean serverRunning(){
        return running;
    }

    private void startServer() throws ServletException, LifecycleException {

        Runtime.getRuntime().addShutdownHook(new ServerShutDownHook());

        Tomcat tomcat = new Tomcat();
        String gafferHome = System.getenv("GAFFER_HOME");
        tomcat.setBaseDir(gafferHome + "/gaffer_web_services_working");
        tomcat.setPort(8080);

        String restContextPath = "/rest";
        String restWarFilePath = restWarPath;

        String uiContextPath = "/ui";
        String uiWarFilePath = uiWarPath;

        tomcat.getHost().setAppBase(".");

        tomcat.addWebapp(restContextPath, restWarFilePath);
        tomcat.addWebapp(uiContextPath, uiWarFilePath);

        System.setProperty("gaffer.schemas", schemaPath);
        System.setProperty("gaffer.storeProperties", storePropertiesPath);
        System.setProperty("gaffer.graph.config", graphConfigPath);

        tomcat.start();
        tomcat.getServer().await();
        running = true;
        while(running){}

        System.exit(0);
    }

    private class ServerShutDownHook extends Thread{
        @Override
        public void run() {

            GafferWebServices.running = false;

        }
    }

    public String getSchemaPath() {
        return schemaPath;
    }

    public void setSchemaPath(String schemaPath) {
        this.schemaPath = schemaPath;
    }

    public String getStorePropertiesPath() {
        return storePropertiesPath;
    }

    public void setStorePropertiesPath(String storePropertiesPath) {
        this.storePropertiesPath = storePropertiesPath;
    }

    public String getGraphConfigPath() {
        return graphConfigPath;
    }

    public void setGraphConfigPath(String graphConfigPath) {
        this.graphConfigPath = graphConfigPath;
    }

    public String getRestWarPath() {
        return restWarPath;
    }

    public void setRestWarPath(String restWarPath) {
        this.restWarPath = restWarPath;
    }

    public String getUiWarPath() {
        return uiWarPath;
    }

    public void setUiWarPath(String uiWarPath) {
        this.uiWarPath = uiWarPath;
    }
}
