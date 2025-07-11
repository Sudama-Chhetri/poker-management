import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '../../../../lib/db';

export async function GET(req: NextRequest) {
  const client = await getConnection();
  try {
    const res = await client.query('SELECT id, name FROM players');
    return NextResponse.json(res.rows);
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json({ message: 'Error fetching players' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  const client = await getConnection();
  try {
    const res = await client.query('INSERT INTO players (name) VALUES ($1) RETURNING id', [name]);
    const newPlayerId = res.rows[0].id;
    return NextResponse.json({ id: newPlayerId, name }, { status: 201 });
  } catch (error) {
    console.error('Error adding player:', error);
    return NextResponse.json({ message: 'Error adding player' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ message: 'Player ID is required' }, { status: 400 });
  }

  const client = await getConnection();
  try {
    await client.query('BEGIN'); // Start transaction

    // Delete associated sessions first
    await client.query('DELETE FROM sessions WHERE "playerId" = $1', [id]);

    // Then delete the player
    const res = await client.query('DELETE FROM players WHERE id = $1 RETURNING id', [id]);

    if (res.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Player not found' }, { status: 404 });
    }

    await client.query('COMMIT'); // Commit transaction
    return NextResponse.json({ message: 'Player and associated sessions deleted' }, { status: 200 });
  } catch (error) {
    await client.query('ROLLBACK'); // Rollback on error
    console.error('Error deleting player:', error);
    return NextResponse.json({ message: 'Error deleting player' }, { status: 500 });
  } finally {
    client.release();
  }
}
