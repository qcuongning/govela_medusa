## check user email

```
docker exec -it medusa-postgres psql -U postgres -d medusa-my-medusa-store -c "SELECT email, first_name, last_name, created_at FROM customer ORDER BY created_at DESC;"
```