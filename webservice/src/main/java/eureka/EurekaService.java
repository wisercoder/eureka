// Copyright (c) 2019-present, Rajeev-K.

// Usage examples:
// GET    http://localhost:8888/eureka-service/api/engine
// GET    http://localhost:8888/eureka-service/api/engine/status
// GET    http://localhost:8888/eureka-service/api/engine/search?query=const
// GET    http://localhost:8888/eureka-service/api/engine/file?path=/projects/foo
// POST   http://localhost:8888/eureka-service/api/engine/index?path=/projects/foo
// DELETE http://localhost:8888/eureka-service/api/engine/index

package eureka;

import java.util.List;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.DELETE;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.QueryParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.InternalServerErrorException;
import javax.ws.rs.BadRequestException;
import org.glassfish.jersey.media.sse.EventOutput;
import org.glassfish.jersey.media.sse.OutboundEvent;
import org.glassfish.jersey.media.sse.SseFeature;
import java.nio.file.Paths;
import java.nio.file.Files;
import java.nio.charset.StandardCharsets;
import java.io.IOException;
import org.apache.lucene.queryparser.classic.ParseException;

@Path("/engine")
public class EurekaService {
    @GET
    public String getMessage() {
        return "Hello from eureka! " + new java.util.Date();
    }

    @GET
    @Path("/status")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getStatus() {
        try {
            SearchEngine engine = SearchEngine.getInstance();
            long count = engine.getDocCount();
            return Response.ok("{\"count\":" + count + "}").build();
        }
        catch (IOException ex) {
            throw new InternalServerErrorException(ex.getMessage());
        }
    }

    @GET
    @Path("/search")
    @Produces(MediaType.APPLICATION_JSON)
    public Response search(@QueryParam("query") String query) {
        if (query == null || query.length() == 0) {
            throw new BadRequestException("query parameter must be supplied");
        }
        try {
            SearchEngine engine = SearchEngine.getInstance();
            List<SearchResult> results = engine.performSearch(query);
            return Response.ok(results).build();
        }
        catch (IOException ex) {
            throw new InternalServerErrorException(ex.getMessage());
        }
        catch (ParseException ex) {
            throw new InternalServerErrorException(ex.getMessage());
        }
    }

    @DELETE
    @Path("/index")
    @Produces(MediaType.APPLICATION_JSON)
    public Response deleteAll() {
        try {
            SearchEngine engine = SearchEngine.getInstance();
            engine.deleteAll();
            return Response.ok("{\"message\": \"Index deleted successfully.\"}").build();
        }
        catch (IOException ex) {
            throw new InternalServerErrorException(ex.getMessage());
        }
    }

    @GET
    @Path("/progress")
    @Produces(SseFeature.SERVER_SENT_EVENTS)
    public EventOutput getIndexingProgress() {
        final EventOutput eventOutput = new EventOutput();
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    for ( ; ; ) {
                        try { Thread.sleep(100); } catch (InterruptedException ex) {}
                        SearchEngine engine = SearchEngine.getInstance();
                        String currentFile = engine.getCurrentlyIndexing();
                        if (currentFile == null)
                            break;
                        eventOutput.write(new OutboundEvent.Builder().name("message").data(String.class, currentFile).build());
                    }
                }
                catch (IOException ex) {
                    throw new RuntimeException("Error occured when writing event.", ex);
                }
                finally {
                    try {
                        eventOutput.close();
                    }
                    catch (IOException ex) {
                        throw new RuntimeException("Error occured when closing event output.", ex);
                    }
                }
            }
        }).start();
        return eventOutput;
    }

    private void startIndexingThread(String path) {
        Thread thread = new Thread() {
            public void run() {
                try {
                    SearchEngine engine = SearchEngine.getInstance();
                    engine.addFolderToIndex(path);
                }
                catch (IOException ex) {
                    System.out.println(ex.getMessage());
                }
            }
        };
        thread.start();
    }

    @POST
    @Path("/index")
    @Produces(MediaType.APPLICATION_JSON)
    public Response indexFolder(@QueryParam("path") String path) {
        if (path == null || path.length() == 0) {
            throw new BadRequestException("path parameter must be supplied");
        }
        final java.nio.file.Path folderPath = Paths.get(path);
        if (!Files.isDirectory(folderPath)) {
            throw new BadRequestException("Supplied string does not point to a folder.");
        }
        startIndexingThread(path);
        return Response.ok("{\"message\": \"Indexing is in progress.\"}").build();
    }

    @GET
    @Produces(MediaType.TEXT_PLAIN)
    @Path("/file")
    public String getFileContents(@QueryParam("path") String path) {
        try {
            return new String(Files.readAllBytes(Paths.get(path)), StandardCharsets.UTF_8);
        }
        catch (IOException ex) {
            throw new BadRequestException("The file could not be opened.");
        }
    }
}
