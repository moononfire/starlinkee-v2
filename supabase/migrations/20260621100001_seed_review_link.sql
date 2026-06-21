-- Add "Zostaw opinię" as the first link for the test restaurant location
-- The link points to the plate scan URL with ?direct=1 to bypass linktree redirect

UPDATE customer_location_links
SET sort_order = sort_order + 1
WHERE customer_location_id = (
  SELECT location_id FROM customer_locations WHERE linktree_slug = 'testrestaurant'
);

INSERT INTO customer_location_links (customer_location_id, title, url, sort_order)
SELECT cl.location_id, 'Zostaw opinię', '/plate/ACTIVE/testsecretactive?direct=1', 1
FROM customer_locations cl
WHERE cl.linktree_slug = 'testrestaurant'
  AND NOT EXISTS (
    SELECT 1 FROM customer_location_links cll
    WHERE cll.customer_location_id = cl.location_id AND cll.title = 'Zostaw opinię'
  );
